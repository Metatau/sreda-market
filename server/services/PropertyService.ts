
import { storage } from "../storage";
import { DatabaseError } from "../utils/errors";
import { parseCoordinates } from "../utils/validation";
import type { PropertyFilters, Pagination } from "../storage";

export class PropertyService {
  async getProperties(filters: PropertyFilters, pagination: Pagination) {
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

  async getMapData(filters: PropertyFilters) {
    try {
      const mapData = await storage.getMapData(filters);
      
      // Convert to GeoJSON format with improved coordinate parsing
      return {
        type: "FeatureCollection" as const,
        features: mapData.map(point => {
          const coordinates = parseCoordinates(point.coordinates);
          
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
              investmentScore: point.investmentScore,
              roi: point.roi,
              liquidityScore: point.liquidityScore,
              investmentRating: point.investmentRating,
            },
          };
        }),
      };
    } catch (error) {
      throw new DatabaseError(`Failed to fetch map data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
