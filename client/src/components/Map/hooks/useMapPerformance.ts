import { useState, useEffect, useCallback, useMemo } from 'react';
import { markerClusteringService, type MarkerCluster } from '../utils/markerCluster';
import type { PropertyWithRelations } from '@/types';

interface MapViewport {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoom: number;
}

interface UseMapPerformanceOptions {
  properties: PropertyWithRelations[];
  viewport: MapViewport;
  maxMarkersVisible?: number;
  enableClustering?: boolean;
  enableVirtualization?: boolean;
}

export function useMapPerformance({
  properties,
  viewport,
  maxMarkersVisible = 1000,
  enableClustering = true,
  enableVirtualization = true
}: UseMapPerformanceOptions) {
  const [visibleClusters, setVisibleClusters] = useState<MarkerCluster[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalProperties: 0,
    visibleProperties: 0,
    clustersCount: 0,
    renderTime: 0
  });

  // Filter properties within viewport bounds
  const propertiesInViewport = useMemo(() => {
    if (!enableVirtualization) return properties;

    const startTime = performance.now();
    
    const filtered = properties.filter(property => {
      if (!property.coordinates) return false;
      
      try {
        let lat: number, lng: number;
        
        if (property.coordinates.startsWith('POINT(')) {
          // PostGIS format: POINT(lng lat)
          const coords = property.coordinates.match(/POINT\(([^)]+)\)/)?.[1];
          if (!coords) return false;
          [lng, lat] = coords.split(' ').map(Number);
        } else {
          // JSON format
          const parsed = JSON.parse(property.coordinates);
          lat = parsed.lat;
          lng = parsed.lng;
        }
        
        return lat >= viewport.bounds.south &&
               lat <= viewport.bounds.north &&
               lng >= viewport.bounds.west &&
               lng <= viewport.bounds.east;
      } catch {
        return false;
      }
    });

    const endTime = performance.now();
    console.log(`Viewport filtering took ${endTime - startTime}ms for ${filtered.length}/${properties.length} properties`);
    
    return filtered;
  }, [properties, viewport.bounds, enableVirtualization]);

  // Generate clusters with performance optimization
  const clusters = useMemo(() => {
    if (!enableClustering) {
      return propertiesInViewport.map(property => {
        const coords = parseCoordinates(property.coordinates || '');
        if (!coords) return null;
        
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
        } as MarkerCluster;
      }).filter(Boolean) as MarkerCluster[];
    }

    const startTime = performance.now();
    const clustered = markerClusteringService.cluster(propertiesInViewport, viewport.zoom);
    const endTime = performance.now();
    
    console.log(`Clustering took ${endTime - startTime}ms for ${clustered.length} clusters from ${propertiesInViewport.length} properties`);
    
    return clustered;
  }, [propertiesInViewport, viewport.zoom, enableClustering]);

  // Limit visible markers for performance
  const optimizedClusters = useMemo(() => {
    if (clusters.length <= maxMarkersVisible) {
      return clusters;
    }

    // Prioritize clusters by importance (count and investment score)
    const sortedClusters = [...clusters].sort((a, b) => {
      const aScore = a.count + (a.properties[0]?.analytics?.investmentScore || 0);
      const bScore = b.count + (b.properties[0]?.analytics?.investmentScore || 0);
      return bScore - aScore;
    });

    return sortedClusters.slice(0, maxMarkersVisible);
  }, [clusters, maxMarkersVisible]);

  // Update visible clusters and metrics
  useEffect(() => {
    const startTime = performance.now();
    
    setVisibleClusters(optimizedClusters);
    
    const totalVisibleProperties = optimizedClusters.reduce((sum, cluster) => sum + cluster.count, 0);
    
    setPerformanceMetrics({
      totalProperties: properties.length,
      visibleProperties: totalVisibleProperties,
      clustersCount: optimizedClusters.length,
      renderTime: performance.now() - startTime
    });
  }, [optimizedClusters, properties.length]);

  const getClusterStyle = useCallback((cluster: MarkerCluster) => {
    return {
      color: markerClusteringService.getClusterColor(cluster),
      size: markerClusteringService.getClusterSize(cluster),
      opacity: cluster.count === 1 ? 0.8 : 0.9,
      zIndex: cluster.count === 1 ? 100 : 200 + cluster.count
    };
  }, []);

  const isClusterVisible = useCallback((cluster: MarkerCluster): boolean => {
    const { position } = cluster;
    return position.lat >= viewport.bounds.south &&
           position.lat <= viewport.bounds.north &&
           position.lng >= viewport.bounds.west &&
           position.lng <= viewport.bounds.east;
  }, [viewport.bounds]);

  return {
    visibleClusters,
    performanceMetrics,
    getClusterStyle,
    isClusterVisible,
    // Utility functions
    getTotalPropertiesInClusters: () => visibleClusters.reduce((sum, cluster) => sum + cluster.count, 0),
    getClusterById: (id: string) => visibleClusters.find(cluster => cluster.id === id),
    getPropertiesInBounds: (bounds: typeof viewport.bounds) => 
      propertiesInViewport.filter(property => {
        if (!property.coordinates) return false;
        const coords = parseCoordinates(property.coordinates);
        if (!coords) return false;
        return coords.lat >= bounds.south && coords.lat <= bounds.north &&
               coords.lng >= bounds.west && coords.lng <= bounds.east;
      })
  };
}

function parseCoordinates(coordinates: string): { lat: number; lng: number } | null {
  try {
    if (coordinates.startsWith('POINT(')) {
      const coords = coordinates.match(/POINT\(([^)]+)\)/)?.[1];
      if (coords) {
        const [lng, lat] = coords.split(' ').map(Number);
        return { lat, lng };
      }
    } else {
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