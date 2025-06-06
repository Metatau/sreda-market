import { db } from '../db';
import { regions, properties } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface CriticalArea {
  regionId: number;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  priority: number;
  propertyCount: number;
  avgPrice: number;
}

interface PreloadedData {
  properties: any[];
  heatmapData: any[];
  infrastructureData: any[];
  lastUpdated: Date;
}

class MapPreloadService {
  private preloadedAreas = new Map<string, PreloadedData>();
  private criticalAreas: CriticalArea[] = [];
  private isPreloading = false;
  private preloadInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeCriticalAreas();
    this.startPreloadScheduler();
  }

  private async initializeCriticalAreas() {
    try {
      // Define critical areas for major Russian cities
      this.criticalAreas = [
        {
          regionId: 1, // Moscow
          name: 'Москва - Центр',
          bounds: {
            north: 55.8520,
            south: 55.6440,
            east: 37.8410,
            west: 37.4820
          },
          priority: 1,
          propertyCount: 0,
          avgPrice: 0
        },
        {
          regionId: 2, // Saint Petersburg
          name: 'Санкт-Петербург - Центр',
          bounds: {
            north: 59.9970,
            south: 59.8700,
            east: 30.4220,
            west: 30.2240
          },
          priority: 2,
          propertyCount: 0,
          avgPrice: 0
        },
        {
          regionId: 4, // Ekaterinburg
          name: 'Екатеринбург - Центр',
          bounds: {
            north: 56.9040,
            south: 56.7800,
            east: 60.7040,
            west: 60.5200
          },
          priority: 3,
          propertyCount: 0,
          avgPrice: 0
        },
        {
          regionId: 3, // Novosibirsk
          name: 'Новосибирск - Центр',
          bounds: {
            north: 55.0840,
            south: 54.9400,
            east: 83.1420,
            west: 82.8600
          },
          priority: 4,
          propertyCount: 0,
          avgPrice: 0
        }
      ];

      // Update property counts and average prices
      await this.updateCriticalAreaStats();
      
      console.log('Critical areas initialized:', this.criticalAreas.length);
    } catch (error) {
      console.error('Error initializing critical areas:', error);
    }
  }

  private async updateCriticalAreaStats() {
    for (const area of this.criticalAreas) {
      try {
        const stats = await db
          .select({
            count: sql<number>`count(*)`,
            avgPrice: sql<number>`avg(${properties.price})`
          })
          .from(properties)
          .where(
            and(
              eq(properties.regionId, area.regionId),
              sql`${properties.coordinates} IS NOT NULL`
            )
          );

        if (stats[0]) {
          area.propertyCount = Number(stats[0].count) || 0;
          area.avgPrice = Number(stats[0].avgPrice) || 0;
        }
      } catch (error) {
        console.error(`Error updating stats for area ${area.name}:`, error);
      }
    }
  }

  private startPreloadScheduler() {
    // Preload every 30 minutes
    this.preloadInterval = setInterval(() => {
      this.preloadCriticalAreas();
    }, 30 * 60 * 1000);

    // Initial preload after 5 seconds
    setTimeout(() => {
      this.preloadCriticalAreas();
    }, 5000);
  }

  async preloadCriticalAreas() {
    if (this.isPreloading) return;
    this.isPreloading = true;

    console.log('Starting critical areas preload...');

    try {
      // Sort by priority
      const sortedAreas = [...this.criticalAreas].sort((a, b) => a.priority - b.priority);

      for (const area of sortedAreas) {
        await this.preloadArea(area);
        // Small delay between preloads to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('Critical areas preload completed');
    } catch (error) {
      console.error('Error during preload:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  private async preloadArea(area: CriticalArea) {
    try {
      const areaKey = `${area.regionId}_${area.bounds.north}_${area.bounds.south}_${area.bounds.east}_${area.bounds.west}`;

      console.log(`Preloading area: ${area.name}`);

      // Preload properties
      const propertiesData = await this.loadPropertiesForArea(area);
      
      // Preload heatmap data
      const heatmapData = await this.generateHeatmapForArea(area, propertiesData);
      
      // Preload infrastructure data (mock for now)
      const infrastructureData = await this.loadInfrastructureForArea(area);

      const preloadedData: PreloadedData = {
        properties: propertiesData,
        heatmapData,
        infrastructureData,
        lastUpdated: new Date()
      };

      this.preloadedAreas.set(areaKey, preloadedData);
      console.log(`Area ${area.name} preloaded: ${propertiesData.length} properties`);

    } catch (error) {
      console.error(`Error preloading area ${area.name}:`, error);
    }
  }

  private async loadPropertiesForArea(area: CriticalArea) {
    try {
      const propertiesData = await db
        .select()
        .from(properties)
        .where(
          and(
            eq(properties.regionId, area.regionId),
            sql`${properties.coordinates} IS NOT NULL`
          )
        )
        .limit(1000); // Limit to prevent memory issues

      return propertiesData.filter(property => {
        if (!property.coordinates) return false;
        
        try {
          let lat, lng;
          if (typeof property.coordinates === 'string') {
            if (property.coordinates.includes(',')) {
              [lat, lng] = property.coordinates.split(',').map(Number);
            } else {
              const coords = JSON.parse(property.coordinates);
              lat = coords.lat || coords[1];
              lng = coords.lng || coords[0];
            }
          }
          
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) return false;
          
          return lat >= area.bounds.south && lat <= area.bounds.north &&
                 lng >= area.bounds.west && lng <= area.bounds.east;
        } catch {
          return false;
        }
      });

    } catch (error) {
      console.error(`Error loading properties for area ${area.name}:`, error);
      return [];
    }
  }

  private async generateHeatmapForArea(area: CriticalArea, propertiesData: any[]) {
    try {
      const heatmapPoints = propertiesData.map(property => {
        try {
          let lat, lng;
          if (typeof property.coordinates === 'string') {
            if (property.coordinates.includes(',')) {
              [lat, lng] = property.coordinates.split(',').map(Number);
            } else {
              const coords = JSON.parse(property.coordinates);
              lat = coords.lat || coords[1];
              lng = coords.lng || coords[0];
            }
          }
          
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
          
          // Calculate intensity based on price and area avg
          const intensity = area.avgPrice > 0 
            ? Math.min(1, (property.price || 0) / area.avgPrice)
            : 0.5;
          
          return {
            lat,
            lng,
            intensity: Math.max(0.1, intensity)
          };
        } catch {
          return null;
        }
      }).filter(Boolean);

      return heatmapPoints;

    } catch (error) {
      console.error(`Error generating heatmap for area ${area.name}:`, error);
      return [];
    }
  }

  private async loadInfrastructureForArea(area: CriticalArea) {
    // Mock infrastructure data for now
    // In a real implementation, this would query infrastructure databases
    return [
      {
        id: `metro_${area.regionId}_1`,
        type: 'metro',
        name: 'Станция метро',
        coordinates: {
          lat: (area.bounds.north + area.bounds.south) / 2,
          lng: (area.bounds.east + area.bounds.west) / 2
        },
        category: 'transport'
      }
    ];
  }

  // Public methods for accessing preloaded data
  getPreloadedProperties(bounds: { north: number; south: number; east: number; west: number }) {
    const areaKey = this.findMatchingAreaKey(bounds);
    if (areaKey) {
      const data = this.preloadedAreas.get(areaKey);
      return data?.properties || null;
    }
    return null;
  }

  getPreloadedHeatmap(bounds: { north: number; south: number; east: number; west: number }) {
    const areaKey = this.findMatchingAreaKey(bounds);
    if (areaKey) {
      const data = this.preloadedAreas.get(areaKey);
      return data?.heatmapData || null;
    }
    return null;
  }

  getPreloadedInfrastructure(bounds: { north: number; south: number; east: number; west: number }) {
    const areaKey = this.findMatchingAreaKey(bounds);
    if (areaKey) {
      const data = this.preloadedAreas.get(areaKey);
      return data?.infrastructureData || null;
    }
    return null;
  }

  private findMatchingAreaKey(bounds: { north: number; south: number; east: number; west: number }): string | null {
    for (const area of this.criticalAreas) {
      // Check if requested bounds overlap with preloaded area
      const overlapLat = bounds.south <= area.bounds.north && bounds.north >= area.bounds.south;
      const overlapLng = bounds.west <= area.bounds.east && bounds.east >= area.bounds.west;
      
      if (overlapLat && overlapLng) {
        return `${area.regionId}_${area.bounds.north}_${area.bounds.south}_${area.bounds.east}_${area.bounds.west}`;
      }
    }
    return null;
  }

  // Get preload status
  getPreloadStatus() {
    return {
      isPreloading: this.isPreloading,
      preloadedAreas: this.preloadedAreas.size,
      criticalAreas: this.criticalAreas.map(area => ({
        name: area.name,
        priority: area.priority,
        propertyCount: area.propertyCount,
        isPreloaded: this.preloadedAreas.has(
          `${area.regionId}_${area.bounds.north}_${area.bounds.south}_${area.bounds.east}_${area.bounds.west}`
        )
      }))
    };
  }

  // Manual preload trigger
  async forcePreload() {
    if (!this.isPreloading) {
      await this.preloadCriticalAreas();
    }
  }

  // Cleanup
  destroy() {
    if (this.preloadInterval) {
      clearInterval(this.preloadInterval);
    }
    this.preloadedAreas.clear();
  }
}

export const mapPreloadService = new MapPreloadService();

// Cleanup on process exit
process.on('SIGTERM', () => mapPreloadService.destroy());
process.on('SIGINT', () => mapPreloadService.destroy());