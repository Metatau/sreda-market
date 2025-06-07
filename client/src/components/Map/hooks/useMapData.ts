import { useMemo } from 'react';
import type { PropertyWithRelations } from '@/types';

export function useMapData(properties: PropertyWithRelations[], mode: string) {
  const mapData = useMemo(() => {
    if (!properties?.length) return [];

    return properties
      .filter(property => {
        // Only include properties with valid coordinates
        if (!property.coordinates) return false;
        
        const coords = property.coordinates.split(',');
        if (coords.length !== 2) return false;
        
        const [lat, lng] = coords.map(Number);
        return !isNaN(lat) && !isNaN(lng);
      })
      .map(property => ({
        ...property,
        coordinates: property.coordinates!.split(',').map(Number) as [number, number]
      }));
  }, [properties]);

  const processedData = useMemo(() => {
    if (mode === 'analytics') {
      // Add analytics-specific processing
      return mapData.map(property => ({
        ...property,
        analyticsScore: calculateAnalyticsScore(property),
        investmentPotential: calculateInvestmentPotential(property)
      }));
    }
    
    return mapData;
  }, [mapData, mode]);

  return {
    mapData: processedData,
    isLoading: false,
    error: null
  };
}

function calculateAnalyticsScore(property: PropertyWithRelations): number {
  let score = 0.5; // Base score
  
  // Price-based scoring
  if (property.price < 5000000) score += 0.2;
  else if (property.price > 20000000) score -= 0.1;
  
  // Area-based scoring
  if (property.area) {
    const areaNum = parseFloat(property.area);
    if (areaNum > 70) score += 0.1;
    if (areaNum < 30) score -= 0.1;
  }
  
  // Investment analytics scoring
  if (property.investmentAnalytics?.roi) {
    score += Math.min(property.investmentAnalytics.roi / 20, 0.3);
  }
  
  return Math.max(0, Math.min(1, score));
}

function calculateInvestmentPotential(property: PropertyWithRelations): 'high' | 'medium' | 'low' {
  const score = calculateAnalyticsScore(property);
  
  if (score > 0.7) return 'high';
  if (score > 0.4) return 'medium';
  return 'low';
}