import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoSearchOptions {
  center: GeoPoint;
  radiusKm: number;
  propertyClassId?: number;
  regionId?: number;
  minPrice?: number;
  maxPrice?: number;
}

export class GeoService {
  /**
   * Convert coordinates to PostGIS POINT format
   */
  static coordsToPostGIS(lat: number, lng: number): string {
    return `POINT(${lng} ${lat})`;
  }

  /**
   * Parse PostGIS POINT to coordinates
   */
  static parsePostGISPoint(point: string): GeoPoint | null {
    try {
      if (point.startsWith('POINT(')) {
        const coords = point.match(/POINT\(([^)]+)\)/)?.[1];
        if (coords) {
          const [lng, lat] = coords.split(' ').map(Number);
          return { lat, lng };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Convert JSON coordinates to PostGIS POINT
   */
  static jsonToPostGIS(coordinates: string): string | null {
    try {
      const parsed = JSON.parse(coordinates);
      if (parsed.lat && parsed.lng) {
        return this.coordsToPostGIS(parsed.lat, parsed.lng);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Find properties within radius using PostGIS
   */
  static async findPropertiesInRadius(options: GeoSearchOptions) {
    const { center, radiusKm, propertyClassId, regionId, minPrice, maxPrice } = options;
    
    let query = sql`
      SELECT 
        p.*,
        ST_Distance(
          ST_Transform(ST_GeomFromText(${this.coordsToPostGIS(center.lat, center.lng)}, 4326), 3857),
          ST_Transform(ST_GeomFromText(p.coordinates, 4326), 3857)
        ) / 1000 as distance_km
      FROM properties p
      WHERE ST_DWithin(
        ST_Transform(ST_GeomFromText(p.coordinates, 4326), 3857),
        ST_Transform(ST_GeomFromText(${this.coordsToPostGIS(center.lat, center.lng)}, 4326), 3857),
        ${radiusKm * 1000}
      )
      AND p.is_active = true
    `;

    if (propertyClassId) {
      query = sql`${query} AND p.property_class_id = ${propertyClassId}`;
    }

    if (regionId) {
      query = sql`${query} AND p.region_id = ${regionId}`;
    }

    if (minPrice) {
      query = sql`${query} AND p.price >= ${minPrice}`;
    }

    if (maxPrice) {
      query = sql`${query} AND p.price <= ${maxPrice}`;
    }

    query = sql`${query} ORDER BY distance_km ASC LIMIT 500`;

    try {
      const result = await db.execute(query);
      return result.rows;
    } catch (error) {
      console.error('PostGIS radius search failed:', error);
      // Fallback to basic filtering without PostGIS
      return this.fallbackRadiusSearch(options);
    }
  }

  /**
   * Fallback method for radius search without PostGIS
   */
  private static async fallbackRadiusSearch(options: GeoSearchOptions) {
    const { center, radiusKm } = options;
    
    const result = await db.execute(sql`
      SELECT * FROM properties 
      WHERE coordinates IS NOT NULL 
      AND is_active = true
      LIMIT 1000
    `);

    return result.rows.filter(property => {
      if (!property.coordinates) return false;
      
      const coords = this.parseCoordinatesFlexible(property.coordinates as string);
      if (!coords) return false;
      
      const distance = this.calculateDistance(center, coords);
      return distance <= radiusKm;
    });
  }

  /**
   * Find properties within bounding box
   */
  static async findPropertiesInBounds(bounds: GeoBounds) {
    try {
      // Try PostGIS first
      const result = await db.execute(sql`
        SELECT p.* FROM properties p
        WHERE ST_Within(
          ST_GeomFromText(p.coordinates, 4326),
          ST_MakeEnvelope(${bounds.west}, ${bounds.south}, ${bounds.east}, ${bounds.north}, 4326)
        )
        AND p.is_active = true
        LIMIT 1000
      `);
      
      return result.rows;
    } catch (error) {
      console.error('PostGIS bounds search failed:', error);
      return this.fallbackBoundsSearch(bounds);
    }
  }

  /**
   * Fallback method for bounds search without PostGIS
   */
  private static async fallbackBoundsSearch(bounds: GeoBounds) {
    const result = await db.execute(sql`
      SELECT * FROM properties 
      WHERE coordinates IS NOT NULL 
      AND is_active = true
      LIMIT 2000
    `);

    return result.rows.filter(property => {
      if (!property.coordinates) return false;
      
      const coords = this.parseCoordinatesFlexible(property.coordinates as string);
      if (!coords) return false;
      
      return coords.lat >= bounds.south && coords.lat <= bounds.north &&
             coords.lng >= bounds.west && coords.lng <= bounds.east;
    });
  }

  /**
   * Get cluster data for map visualization
   */
  static async getClusterData(bounds: GeoBounds, zoom: number) {
    const gridSize = this.getGridSizeForZoom(zoom);
    
    try {
      // PostGIS clustering query
      const result = await db.execute(sql`
        SELECT 
          ST_X(centroid) as lng,
          ST_Y(centroid) as lat,
          COUNT(*) as count,
          AVG(price) as avg_price,
          MIN(price) as min_price,
          MAX(price) as max_price,
          ARRAY_AGG(id) as property_ids
        FROM (
          SELECT 
            id, 
            price,
            ST_Centroid(
              ST_Collect(ST_GeomFromText(coordinates, 4326))
            ) OVER (
              PARTITION BY 
                FLOOR(ST_X(ST_GeomFromText(coordinates, 4326)) * ${gridSize}),
                FLOOR(ST_Y(ST_GeomFromText(coordinates, 4326)) * ${gridSize})
            ) as centroid
          FROM properties
          WHERE ST_Within(
            ST_GeomFromText(coordinates, 4326),
            ST_MakeEnvelope(${bounds.west}, ${bounds.south}, ${bounds.east}, ${bounds.north}, 4326)
          )
          AND is_active = true
        ) clustered
        GROUP BY ST_X(centroid), ST_Y(centroid)
        ORDER BY count DESC
        LIMIT 200
      `);
      
      return result.rows;
    } catch (error) {
      console.error('PostGIS clustering failed:', error);
      return this.fallbackClustering(bounds, zoom);
    }
  }

  /**
   * Fallback clustering without PostGIS
   */
  private static async fallbackClustering(bounds: GeoBounds, zoom: number) {
    const properties = await this.fallbackBoundsSearch(bounds);
    const gridSize = this.getGridSizeForZoom(zoom);
    const clusters = new Map();

    properties.forEach(property => {
      const coords = this.parseCoordinatesFlexible(property.coordinates as string);
      if (!coords) return;

      const gridKey = `${Math.floor(coords.lat * gridSize)},${Math.floor(coords.lng * gridSize)}`;
      
      if (!clusters.has(gridKey)) {
        clusters.set(gridKey, {
          lat: coords.lat,
          lng: coords.lng,
          count: 0,
          total_price: 0,
          min_price: property.price,
          max_price: property.price,
          property_ids: []
        });
      }
      
      const cluster = clusters.get(gridKey);
      cluster.count++;
      cluster.total_price += property.price || 0;
      cluster.min_price = Math.min(cluster.min_price, property.price || 0);
      cluster.max_price = Math.max(cluster.max_price, property.price || 0);
      cluster.property_ids.push(property.id);
    });

    return Array.from(clusters.values()).map(cluster => ({
      ...cluster,
      avg_price: cluster.total_price / cluster.count
    }));
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  static calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Flexible coordinate parsing for both PostGIS and JSON formats
   */
  static parseCoordinatesFlexible(coordinates: string): GeoPoint | null {
    try {
      // Try PostGIS format first
      if (coordinates.startsWith('POINT(')) {
        return this.parsePostGISPoint(coordinates);
      }
      
      // Try JSON format
      const parsed = JSON.parse(coordinates);
      if (parsed.lat && parsed.lng) {
        return { lat: parsed.lat, lng: parsed.lng };
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if PostGIS extension is available
   */
  static async checkPostGISAvailability(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT PostGIS_Version()`);
      return true;
    } catch {
      console.warn('PostGIS extension not available, using fallback methods');
      return false;
    }
  }

  /**
   * Initialize PostGIS extension if not exists
   */
  static async initializePostGIS(): Promise<boolean> {
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
      console.log('PostGIS extension initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize PostGIS:', error);
      return false;
    }
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static getGridSizeForZoom(zoom: number): number {
    // Adjust grid size based on zoom level for clustering
    return Math.pow(2, Math.max(0, 16 - zoom)) * 100;
  }
}

export const geoService = new GeoService();