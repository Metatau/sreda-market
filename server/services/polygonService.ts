import { db } from '../db';
import { storage } from '../storage';

export interface Polygon {
  id: number;
  userId: number;
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolygonArea {
  totalProperties: number;
  avgPrice: number;
  avgPricePerSqm: number;
  priceRange: { min: number; max: number };
  propertyTypes: Record<string, number>;
  investmentScore: number;
  infrastructureScore: number;
  transportScore: number;
  developmentPotential: 'low' | 'medium' | 'high' | 'excellent';
  estimatedGrowth: number;
}

class PolygonService {
  async createPolygon(data: {
    userId: number;
    name: string;
    coordinates: Array<{ lat: number; lng: number }>;
    color: string;
    description?: string;
  }): Promise<Polygon> {
    // Create PostGIS polygon from coordinates
    const coordinateString = data.coordinates
      .map(coord => `${coord.lng} ${coord.lat}`)
      .join(',');
    
    const polygonWKT = `POLYGON((${coordinateString},${data.coordinates[0].lng} ${data.coordinates[0].lat}))`;
    
    const result = await db.execute(`
      INSERT INTO user_polygons (user_id, name, coordinates_json, polygon_geom, color, description)
      VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6)
      RETURNING id, created_at, updated_at
    `, [
      data.userId,
      data.name,
      JSON.stringify(data.coordinates),
      polygonWKT,
      data.color,
      data.description || null
    ]);

    const row = result.rows[0];
    
    return {
      id: row.id,
      userId: data.userId,
      name: data.name,
      coordinates: data.coordinates,
      color: data.color,
      description: data.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getUserPolygons(userId: number): Promise<Polygon[]> {
    const result = await db.execute(`
      SELECT id, user_id, name, coordinates_json, color, description, created_at, updated_at
      FROM user_polygons 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      coordinates: JSON.parse(row.coordinates_json),
      color: row.color,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async analyzePolygonArea(polygonId: number, userId: number): Promise<PolygonArea> {
    // Get polygon geometry
    const polygonResult = await db.execute(`
      SELECT polygon_geom 
      FROM user_polygons 
      WHERE id = $1 AND user_id = $2
    `, [polygonId, userId]);

    if (polygonResult.rows.length === 0) {
      throw new Error('Polygon not found or access denied');
    }

    // Find all properties within the polygon
    const propertiesResult = await db.execute(`
      SELECT p.*, pc.name as property_class_name, pa.roi, pa.liquidity_score
      FROM properties p
      LEFT JOIN property_classes pc ON p.property_class_id = pc.id
      LEFT JOIN property_analytics pa ON p.id = pa.property_id
      WHERE p.location IS NOT NULL 
      AND ST_Within(p.location, (
        SELECT polygon_geom 
        FROM user_polygons 
        WHERE id = $1
      ))
      AND p.is_active = true
    `, [polygonId]);

    const properties = propertiesResult.rows;
    
    if (properties.length === 0) {
      return {
        totalProperties: 0,
        avgPrice: 0,
        avgPricePerSqm: 0,
        priceRange: { min: 0, max: 0 },
        propertyTypes: {},
        investmentScore: 0,
        infrastructureScore: 0,
        transportScore: 0,
        developmentPotential: 'low',
        estimatedGrowth: 0
      };
    }

    // Calculate basic statistics
    const prices = properties.map(p => p.price);
    const pricesPerSqm = properties.filter(p => p.price_per_sqm).map(p => p.price_per_sqm);
    
    const totalProperties = properties.length;
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const avgPricePerSqm = pricesPerSqm.length > 0 
      ? pricesPerSqm.reduce((sum, price) => sum + price, 0) / pricesPerSqm.length 
      : 0;
    
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };

    // Count property types
    const propertyTypes: Record<string, number> = {};
    properties.forEach(p => {
      const type = p.property_type || 'unknown';
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;
    });

    // Calculate investment metrics
    const roiValues = properties.filter(p => p.roi).map(p => parseFloat(p.roi));
    const liquidityValues = properties.filter(p => p.liquidity_score).map(p => p.liquidity_score);
    
    const avgRoi = roiValues.length > 0 
      ? roiValues.reduce((sum, roi) => sum + roi, 0) / roiValues.length 
      : 5;
    
    const avgLiquidity = liquidityValues.length > 0
      ? liquidityValues.reduce((sum, liq) => sum + liq, 0) / liquidityValues.length
      : 5;

    const investmentScore = Math.min((avgRoi * 10 + avgLiquidity) / 2, 100);

    // Calculate infrastructure and transport scores for the area
    const centerPoint = this.calculatePolygonCenter(polygonId);
    const infrastructureScore = await this.calculateAreaInfrastructureScore(centerPoint);
    const transportScore = await this.calculateAreaTransportScore(centerPoint);

    // Determine development potential
    const overallScore = (investmentScore + infrastructureScore + transportScore) / 3;
    let developmentPotential: 'low' | 'medium' | 'high' | 'excellent' = 'low';
    
    if (overallScore >= 80) developmentPotential = 'excellent';
    else if (overallScore >= 65) developmentPotential = 'high';
    else if (overallScore >= 45) developmentPotential = 'medium';

    // Estimate price growth based on scores
    const estimatedGrowth = this.calculateEstimatedGrowth(overallScore, infrastructureScore);

    return {
      totalProperties,
      avgPrice,
      avgPricePerSqm,
      priceRange,
      propertyTypes,
      investmentScore,
      infrastructureScore,
      transportScore,
      developmentPotential,
      estimatedGrowth
    };
  }

  async deletePolygon(polygonId: number, userId: number): Promise<void> {
    const result = await db.execute(`
      DELETE FROM user_polygons 
      WHERE id = $1 AND user_id = $2
    `, [polygonId, userId]);

    if (result.rowCount === 0) {
      throw new Error('Polygon not found or access denied');
    }
  }

  private async calculatePolygonCenter(polygonId: number): Promise<{ lat: number; lng: number }> {
    const result = await db.execute(`
      SELECT ST_Y(ST_Centroid(polygon_geom)) as lat, ST_X(ST_Centroid(polygon_geom)) as lng
      FROM user_polygons 
      WHERE id = $1
    `, [polygonId]);

    const row = result.rows[0];
    return { lat: row.lat, lng: row.lng };
  }

  private async calculateAreaInfrastructureScore(center: { lat: number; lng: number }): Promise<number> {
    // Count infrastructure points within 1km radius
    // This would integrate with actual infrastructure data
    
    // For now, calculate based on property density and known infrastructure
    const result = await db.execute(`
      SELECT COUNT(*) as infrastructure_count
      FROM properties p
      WHERE p.location IS NOT NULL
      AND ST_DWithin(
        p.location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        1000
      )
    `, [center.lng, center.lat]);

    const count = parseInt(result.rows[0].infrastructure_count);
    return Math.min((count / 20) * 100, 100); // Normalize to 0-100
  }

  private async calculateAreaTransportScore(center: { lat: number; lng: number }): Promise<number> {
    // This would integrate with transport API to get real metro/bus data
    // For now, estimate based on proximity to city center and property density
    
    // Distance from Moscow center (Red Square)
    const moscowCenter = { lat: 55.7558, lng: 37.6176 };
    const distanceFromCenter = this.calculateDistance(center, moscowCenter);
    
    let score = 100;
    
    // Decrease score based on distance from center
    if (distanceFromCenter > 5000) score -= 20; // > 5km
    if (distanceFromCenter > 10000) score -= 30; // > 10km
    if (distanceFromCenter > 20000) score -= 40; // > 20km
    
    return Math.max(score, 20); // Minimum 20 points
  }

  private calculateEstimatedGrowth(overallScore: number, infrastructureScore: number): number {
    // Base growth rate
    let growth = 3.0; // 3% base
    
    // Add bonus based on scores
    if (overallScore >= 80) growth += 4.0;
    else if (overallScore >= 65) growth += 2.5;
    else if (overallScore >= 45) growth += 1.0;
    
    if (infrastructureScore >= 75) growth += 1.5;
    
    return Math.min(growth, 12.0); // Cap at 12%
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const polygonService = new PolygonService();