
import { storage } from "../storage";
import { DatabaseError } from "../utils/errors";

export interface PropertyFilters {
  regionId?: number;
  propertyClassId?: number;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  propertyType?: string;
}

export interface PaginationOptions {
  page: number;
  perPage: number;
}

export class PropertyService {
  async getProperties(filters: PropertyFilters, pagination: PaginationOptions) {
    try {
      return await storage.getProperties(filters, pagination);
    } catch (error) {
      throw new DatabaseError(`Failed to fetch properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProperty(id: number) {
    try {
      return await storage.getProperty(id);
    } catch (error) {
      throw new DatabaseError(`Failed to fetch property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchProperties(query: string, filters: PropertyFilters) {
    try {
      return await storage.searchProperties(query, filters);
    } catch (error) {
      throw new DatabaseError(`Failed to search properties: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMapData(filters: { regionId?: number; propertyClassId?: number }) {
    try {
      const mapData = await storage.getMapData(filters);
      
      // Convert to GeoJSON format
      return {
        type: "FeatureCollection" as const,
        features: mapData.map(point => {
          // Parse coordinates from PostGIS POINT format
          const coordMatch = point.coordinates.match(/POINT\(([^)]+)\)/);
          let coordinates = [37.6176, 55.7558]; // Default to Moscow coordinates
          
          if (coordMatch && coordMatch[1]) {
            const [lng, lat] = coordMatch[1].split(' ').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
              coordinates = [lng, lat];
            }
          }
          
          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates,
            },
            properties: {
              id: point.id,
              title: point.title,
              price: point.price,
              pricePerSqm: point.pricePerSqm,
              propertyClass: point.propertyClass,
              rooms: point.rooms,
              area: point.area,
            },
          };
        }),
      };
    } catch (error) {
      throw new DatabaseError(`Failed to fetch map data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
