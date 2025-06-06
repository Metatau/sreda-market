import type { PropertyWithRelations } from '@/types';

export interface MarkerCluster {
  id: string;
  position: { lat: number; lng: number };
  properties: PropertyWithRelations[];
  count: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export class MarkerClusteringService {
  private gridSize: number;
  private maxZoom: number;

  constructor(gridSize: number = 60, maxZoom: number = 16) {
    this.gridSize = gridSize;
    this.maxZoom = maxZoom;
  }

  cluster(properties: PropertyWithRelations[], zoom: number): MarkerCluster[] {
    if (zoom >= this.maxZoom) {
      // At high zoom levels, show individual markers
      return properties.map(property => this.createSingleMarkerCluster(property));
    }

    const clusters = new Map<string, MarkerCluster>();
    const gridSize = this.getGridSize(zoom);

    properties.forEach(property => {
      if (!property.coordinates) return;
      
      const coords = this.parseCoordinates(property.coordinates);
      if (!coords) return;

      const gridKey = this.getGridKey(coords.lat, coords.lng, gridSize);
      
      if (clusters.has(gridKey)) {
        this.addToCluster(clusters.get(gridKey)!, property, coords);
      } else {
        clusters.set(gridKey, this.createNewCluster(gridKey, property, coords));
      }
    });

    return Array.from(clusters.values());
  }

  private getGridSize(zoom: number): number {
    // Adjust grid size based on zoom level
    const scale = Math.pow(2, this.maxZoom - zoom);
    return this.gridSize * scale;
  }

  private getGridKey(lat: number, lng: number, gridSize: number): string {
    const latGrid = Math.floor(lat * gridSize);
    const lngGrid = Math.floor(lng * gridSize);
    return `${latGrid},${lngGrid}`;
  }

  private parseCoordinates(coordinates: string): { lat: number; lng: number } | null {
    try {
      if (coordinates.startsWith('POINT(')) {
        // PostGIS format: POINT(lng lat)
        const coords = coordinates.match(/POINT\(([^)]+)\)/)?.[1];
        if (coords) {
          const [lng, lat] = coords.split(' ').map(Number);
          return { lat, lng };
        }
      } else {
        // JSON format: {"lat": 55.7558, "lng": 37.6176}
        const parsed = JSON.parse(coordinates);
        if (parsed.lat && parsed.lng) {
          return { lat: parsed.lat, lng: parsed.lng };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private createSingleMarkerCluster(property: PropertyWithRelations): MarkerCluster {
    const coords = this.parseCoordinates(property.coordinates || '');
    if (!coords) {
      throw new Error('Invalid coordinates for property');
    }

    return {
      id: `single-${property.id}`,
      position: coords,
      properties: [property],
      count: 1,
      avgPrice: property.price,
      priceRange: { min: property.price, max: property.price },
      bounds: {
        north: coords.lat,
        south: coords.lat,
        east: coords.lng,
        west: coords.lng
      }
    };
  }

  private createNewCluster(
    gridKey: string,
    property: PropertyWithRelations,
    coords: { lat: number; lng: number }
  ): MarkerCluster {
    return {
      id: `cluster-${gridKey}`,
      position: coords,
      properties: [property],
      count: 1,
      avgPrice: property.price,
      priceRange: { min: property.price, max: property.price },
      bounds: {
        north: coords.lat,
        south: coords.lat,
        east: coords.lng,
        west: coords.lng
      }
    };
  }

  private addToCluster(
    cluster: MarkerCluster,
    property: PropertyWithRelations,
    coords: { lat: number; lng: number }
  ): void {
    cluster.properties.push(property);
    cluster.count++;

    // Update average position (centroid)
    const totalLat = cluster.position.lat * (cluster.count - 1) + coords.lat;
    const totalLng = cluster.position.lng * (cluster.count - 1) + coords.lng;
    cluster.position.lat = totalLat / cluster.count;
    cluster.position.lng = totalLng / cluster.count;

    // Update price statistics
    const totalPrice = cluster.avgPrice * (cluster.count - 1) + property.price;
    cluster.avgPrice = totalPrice / cluster.count;
    cluster.priceRange.min = Math.min(cluster.priceRange.min, property.price);
    cluster.priceRange.max = Math.max(cluster.priceRange.max, property.price);

    // Update bounds
    cluster.bounds.north = Math.max(cluster.bounds.north, coords.lat);
    cluster.bounds.south = Math.min(cluster.bounds.south, coords.lat);
    cluster.bounds.east = Math.max(cluster.bounds.east, coords.lng);
    cluster.bounds.west = Math.min(cluster.bounds.west, coords.lng);
  }

  getClusterColor(cluster: MarkerCluster): string {
    const { count } = cluster;
    
    if (count === 1) return '#3B82F6'; // Blue for single properties
    if (count < 10) return '#10B981'; // Green for small clusters
    if (count < 50) return '#F59E0B'; // Amber for medium clusters
    if (count < 100) return '#EF4444'; // Red for large clusters
    return '#7C3AED'; // Purple for very large clusters
  }

  getClusterSize(cluster: MarkerCluster): number {
    const { count } = cluster;
    
    if (count === 1) return 12;
    if (count < 10) return 20;
    if (count < 50) return 30;
    if (count < 100) return 40;
    return 50;
  }
}

export const markerClusteringService = new MarkerClusteringService();