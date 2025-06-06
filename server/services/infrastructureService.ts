import { db } from '../db';
import { storage } from '../storage';

export interface InfrastructurePoint {
  id: string;
  type: 'metro' | 'transport' | 'school' | 'hospital' | 'shopping' | 'park' | 'business';
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  amenities?: string[];
  distance?: number; // from reference point
}

export interface InfrastructureData {
  social: InfrastructurePoint[]; // schools, hospitals, parks
  commercial: InfrastructurePoint[]; // shopping, restaurants, services
  transport: InfrastructurePoint[]; // metro, bus stops, transport hubs
}

export interface DistrictAnalysis {
  districtId: string;
  name: string;
  coordinates: { lat: number; lng: number };
  socialScore: number; // 0-100
  commercialScore: number; // 0-100
  transportScore: number; // 0-100
  overallScore: number; // 0-100
  investmentPotential: 'low' | 'medium' | 'high' | 'excellent';
  priceGrowthForecast: number; // percentage
  liquidityScore: number; // 0-100
  developmentProjects: string[];
}

class InfrastructureService {
  // Get infrastructure data for a specific area
  async getInfrastructureData(
    bounds: { north: number; south: number; east: number; west: number }
  ): Promise<InfrastructureData> {
    // For now, we'll use Overpass API to get real infrastructure data
    // This would be replaced with actual API calls to get real data
    
    const social = await this.getSocialInfrastructure(bounds);
    const commercial = await this.getCommercialInfrastructure(bounds);
    const transport = await this.getTransportInfrastructure(bounds);

    return { social, commercial, transport };
  }

  // Get transport accessibility for properties
  async getTransportAccessibility(propertyId: number): Promise<{
    metroDistance: number; // meters
    metroStations: InfrastructurePoint[];
    busStops: InfrastructurePoint[];
    walkScore: number; // 0-100
    transitScore: number; // 0-100
  }> {
    const property = await storage.getProperty(propertyId);
    if (!property || !property.coordinates) {
      throw new Error('Property not found or no coordinates');
    }

    const [lat, lng] = property.coordinates.split(',').map(Number);
    
    // Find nearest metro stations within 2km
    const metroStations = await this.findNearbyInfrastructure(
      { lat, lng }, 
      'metro', 
      2000
    );

    // Find nearby bus stops within 500m
    const busStops = await this.findNearbyInfrastructure(
      { lat, lng }, 
      'transport', 
      500
    );

    const metroDistance = metroStations.length > 0 ? metroStations[0].distance! : Infinity;
    
    // Calculate walk score based on nearby amenities
    const walkScore = await this.calculateWalkScore({ lat, lng });
    
    // Calculate transit score based on metro and bus accessibility
    const transitScore = this.calculateTransitScore(metroDistance, busStops.length);

    return {
      metroDistance,
      metroStations,
      busStops,
      walkScore,
      transitScore
    };
  }

  // Analyze and compare districts
  async analyzeDistricts(regionId: number): Promise<DistrictAnalysis[]> {
    // Get all unique districts in the region
    const districts = await this.getDistrictsInRegion(regionId);
    
    const analyses: DistrictAnalysis[] = [];
    
    for (const district of districts) {
      const analysis = await this.analyzeDistrict(district);
      analyses.push(analysis);
    }

    // Sort by overall score
    return analyses.sort((a, b) => b.overallScore - a.overallScore);
  }

  // Create property density heatmap
  async createPropertyHeatmap(
    bounds: { north: number; south: number; east: number; west: number }
  ): Promise<Array<{ lat: number; lng: number; intensity: number }>> {
    // Get all active properties within bounds
    const result = await db.execute(`
      SELECT ST_Y(location) as lat, ST_X(location) as lng, price, price_per_sqm
      FROM properties 
      WHERE location IS NOT NULL 
      AND is_active = true
      AND ST_Within(location, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    `, [bounds.west, bounds.south, bounds.east, bounds.north]);

    const properties = result.rows;
    const gridSize = 0.003; // approximately 300m
    return this.createPropertyGrid(properties, bounds, gridSize);
  }

  // Create heatmap data for infrastructure
  async createInfrastructureHeatmap(
    type: 'social' | 'commercial' | 'transport' | 'combined',
    bounds: { north: number; south: number; east: number; west: number }
  ): Promise<Array<{ lat: number; lng: number; intensity: number }>> {
    const infrastructure = await this.getInfrastructureData(bounds);
    
    let points: InfrastructurePoint[] = [];
    
    switch (type) {
      case 'social':
        points = infrastructure.social;
        break;
      case 'commercial':
        points = infrastructure.commercial;
        break;
      case 'transport':
        points = infrastructure.transport;
        break;
      case 'combined':
        points = [...infrastructure.social, ...infrastructure.commercial, ...infrastructure.transport];
        break;
    }

    // Create grid-based heatmap
    const gridSize = 0.005; // approximately 500m
    const heatmapData = this.createInfrastructureGrid(points, bounds, gridSize);
    
    return heatmapData;
  }

  // Private methods
  private async getSocialInfrastructure(bounds: any): Promise<InfrastructurePoint[]> {
    // This would query Overpass API or local database for schools, hospitals, parks
    // For demo, returning sample data structure
    return [
      {
        id: 'school_1',
        type: 'school',
        name: 'Школа №123',
        category: 'education',
        coordinates: { lat: 55.7558, lng: 37.6176 },
        rating: 8.5
      }
      // More schools, hospitals, parks would be loaded from real APIs
    ];
  }

  private async getCommercialInfrastructure(bounds: any): Promise<InfrastructurePoint[]> {
    // Query for shopping centers, restaurants, services
    return [
      {
        id: 'mall_1',
        type: 'shopping',
        name: 'ТЦ Европейский',
        category: 'shopping',
        coordinates: { lat: 55.7558, lng: 37.6176 },
        rating: 9.0
      }
    ];
  }

  private async getTransportInfrastructure(bounds: any): Promise<InfrastructurePoint[]> {
    // Query for metro stations, bus stops, transport hubs
    return [
      {
        id: 'metro_1',
        type: 'metro',
        name: 'Киевская',
        category: 'metro',
        coordinates: { lat: 55.7558, lng: 37.6176 },
        rating: 8.0
      }
    ];
  }

  private async findNearbyInfrastructure(
    center: { lat: number; lng: number },
    type: string,
    radius: number
  ): Promise<InfrastructurePoint[]> {
    // Use PostGIS spatial query to find nearby infrastructure
    const query = `
      SELECT * FROM infrastructure_points 
      WHERE type = $1 
      AND ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        $4
      )
      ORDER BY ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
      )
    `;
    
    // This would execute the actual query
    // For now, return sample data
    return [];
  }

  private async calculateWalkScore(center: { lat: number; lng: number }): Promise<number> {
    // Calculate walkability based on nearby amenities
    // Algorithm considers density and variety of nearby services
    const amenities = await this.findNearbyInfrastructure(center, 'all', 1000);
    
    const categories = new Set(amenities.map(a => a.category));
    const density = Math.min(amenities.length / 20, 1); // normalize to 0-1
    const variety = Math.min(categories.size / 10, 1); // normalize to 0-1
    
    return Math.round((density * 0.6 + variety * 0.4) * 100);
  }

  private calculateTransitScore(metroDistance: number, busStopsCount: number): number {
    let score = 0;
    
    // Metro accessibility (max 60 points)
    if (metroDistance <= 300) score += 60;
    else if (metroDistance <= 600) score += 45;
    else if (metroDistance <= 1000) score += 30;
    else if (metroDistance <= 1500) score += 15;
    
    // Bus accessibility (max 40 points)
    score += Math.min(busStopsCount * 10, 40);
    
    return Math.min(score, 100);
  }

  private async getDistrictsInRegion(regionId: number): Promise<string[]> {
    const result = await db.execute(`
      SELECT DISTINCT district 
      FROM properties 
      WHERE region_id = $1 AND district IS NOT NULL
    `, [regionId]);
    
    return result.rows.map((row: any) => row.district);
  }

  private async analyzeDistrict(districtName: string): Promise<DistrictAnalysis> {
    // Get district center coordinates
    const center = await this.getDistrictCenter(districtName);
    
    // Calculate scores
    const socialScore = await this.calculateSocialScore(center);
    const commercialScore = await this.calculateCommercialScore(center);
    const transportScore = await this.calculateTransportScore(center);
    
    const overallScore = (socialScore + commercialScore + transportScore) / 3;
    
    let investmentPotential: 'low' | 'medium' | 'high' | 'excellent' = 'low';
    if (overallScore >= 85) investmentPotential = 'excellent';
    else if (overallScore >= 70) investmentPotential = 'high';
    else if (overallScore >= 55) investmentPotential = 'medium';
    
    return {
      districtId: districtName,
      name: districtName,
      coordinates: center,
      socialScore,
      commercialScore,
      transportScore,
      overallScore,
      investmentPotential,
      priceGrowthForecast: this.calculatePriceGrowthForecast(overallScore),
      liquidityScore: this.calculateLiquidityScore(overallScore, transportScore),
      developmentProjects: await this.getDevelopmentProjects(districtName)
    };
  }

  private async getDistrictCenter(districtName: string): Promise<{ lat: number; lng: number }> {
    // Calculate center of all properties in district
    const result = await db.execute(`
      SELECT AVG(ST_Y(location)) as lat, AVG(ST_X(location)) as lng
      FROM properties 
      WHERE district = $1 AND location IS NOT NULL
    `, [districtName]);
    
    const row = result.rows[0];
    return { lat: row.lat || 55.7558, lng: row.lng || 37.6176 };
  }

  private async calculateSocialScore(center: { lat: number; lng: number }): Promise<number> {
    // Count schools, hospitals, parks within 1km radius
    const socialPoints = await this.findNearbyInfrastructure(center, 'social', 1000);
    return Math.min((socialPoints.length / 10) * 100, 100);
  }

  private async calculateCommercialScore(center: { lat: number; lng: number }): Promise<number> {
    // Count shopping, restaurants, services within 1km radius
    const commercialPoints = await this.findNearbyInfrastructure(center, 'commercial', 1000);
    return Math.min((commercialPoints.length / 15) * 100, 100);
  }

  private async calculateTransportScore(center: { lat: number; lng: number }): Promise<number> {
    // Calculate transport score based on proximity to transport infrastructure
    const transportPoints = await this.findNearbyInfrastructure(center, 'transport', 1000);
    const metroPoints = transportPoints.filter(p => p.category === 'metro');
    const busPoints = transportPoints.filter(p => p.category === 'bus');
    
    let score = 0;
    
    // Metro accessibility (max 60 points)
    if (metroPoints.length > 0) {
      const closestMetro = metroPoints[0];
      if (closestMetro.distance! <= 300) score += 60;
      else if (closestMetro.distance! <= 600) score += 45;
      else if (closestMetro.distance! <= 1000) score += 30;
    }
    
    // Bus accessibility (max 40 points)
    score += Math.min(busPoints.length * 8, 40);
    
    return Math.min(score, 100);
  }

  private calculatePriceGrowthForecast(overallScore: number): number {
    // Higher infrastructure score correlates with higher price growth potential
    if (overallScore >= 85) return 8.5; // 8.5% annual growth
    if (overallScore >= 70) return 6.5;
    if (overallScore >= 55) return 4.5;
    return 2.5;
  }

  private calculateLiquidityScore(overallScore: number, transportScore: number): number {
    // Good infrastructure improves liquidity
    return Math.min(overallScore * 0.7 + transportScore * 0.3, 100);
  }

  private async getDevelopmentProjects(districtName: string): Promise<string[]> {
    // Query for known development projects in the area
    // This would come from municipal data or development databases
    return [
      'Новая станция метро (2025)',
      'Торговый центр (2024)',
      'Школа №456 (2024)'
    ];
  }

  private createInfrastructureGrid(
    points: InfrastructurePoint[],
    bounds: { north: number; south: number; east: number; west: number },
    gridSize: number
  ): Array<{ lat: number; lng: number; intensity: number }> {
    const grid: Array<{ lat: number; lng: number; intensity: number }> = [];
    
    for (let lat = bounds.south; lat <= bounds.north; lat += gridSize) {
      for (let lng = bounds.west; lng <= bounds.east; lng += gridSize) {
        // Count infrastructure points within grid cell
        const nearby = points.filter(point => {
          const distance = this.calculateDistance(
            { lat, lng },
            point.coordinates
          );
          return distance <= gridSize * 111000; // Convert to meters
        });
        
        if (nearby.length > 0) {
          grid.push({
            lat,
            lng,
            intensity: Math.min(nearby.length / 5, 1) // normalize intensity
          });
        }
      }
    }
    
    return grid;
  }

  private createPropertyGrid(
    properties: any[],
    bounds: { north: number; south: number; east: number; west: number },
    gridSize: number
  ): Array<{ lat: number; lng: number; intensity: number }> {
    const grid: Array<{ lat: number; lng: number; intensity: number }> = [];
    
    for (let lat = bounds.south; lat <= bounds.north; lat += gridSize) {
      for (let lng = bounds.west; lng <= bounds.east; lng += gridSize) {
        // Count properties within grid cell
        const nearby = properties.filter(property => {
          const distance = this.calculateDistance(
            { lat, lng },
            { lat: property.lat, lng: property.lng }
          );
          return distance <= gridSize * 111000; // Convert to meters
        });
        
        if (nearby.length > 0) {
          // Calculate intensity based on property count and average price
          const avgPrice = nearby.reduce((sum, p) => sum + p.price, 0) / nearby.length;
          const priceIntensity = Math.min(avgPrice / 50000000, 1); // normalize price
          const densityIntensity = Math.min(nearby.length / 10, 1); // normalize density
          
          grid.push({
            lat,
            lng,
            intensity: (priceIntensity * 0.6 + densityIntensity * 0.4)
          });
        }
      }
    }
    
    return grid;
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    // Haversine formula for distance calculation
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

export const infrastructureService = new InfrastructureService();