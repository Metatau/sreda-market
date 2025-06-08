import { useQuery } from '@tanstack/react-query';

interface PropertyAnalytics {
  [propertyId: number]: {
    investmentRating?: string;
    rentalYield?: string;
    flipRoi?: string;
    liquidityScore?: number;
    safeHavenScore?: number;
    recommendedStrategy?: string;
  };
}

export function usePropertyAnalytics(propertyIds: number[]) {
  return useQuery<PropertyAnalytics>({
    queryKey: ['/api/property-analytics', propertyIds.sort().join(',')],
    queryFn: async () => {
      if (!propertyIds.length) return {};
      
      const analytics: PropertyAnalytics = {};
      
      // Загружаем аналитику для каждого объекта
      const promises = propertyIds.map(async (propertyId) => {
        try {
          const response = await fetch(`/api/investment-analytics/${propertyId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              analytics[propertyId] = result.data;
            }
          }
        } catch (error) {
          console.warn(`Failed to load analytics for property ${propertyId}:`, error);
        }
      });
      
      await Promise.all(promises);
      return analytics;
    },
    enabled: propertyIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useBulkPropertyAnalytics(propertyIds: number[]) {
  return useQuery<PropertyAnalytics>({
    queryKey: ['/api/bulk-property-analytics', propertyIds.sort().join(',')],
    queryFn: async () => {
      if (!propertyIds.length) return {};
      
      try {
        const response = await fetch('/api/investment-analytics/batch-get', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ propertyIds }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            return result.data;
          }
        }
        
        // Fallback к индивидуальным запросам
        const analytics: PropertyAnalytics = {};
        const promises = propertyIds.map(async (propertyId) => {
          try {
            const response = await fetch(`/api/investment-analytics/${propertyId}`);
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                analytics[propertyId] = result.data;
              }
            }
          } catch (error) {
            console.warn(`Failed to load analytics for property ${propertyId}:`, error);
          }
        });
        
        await Promise.all(promises);
        return analytics;
      } catch (error) {
        console.error('Failed to load bulk analytics:', error);
        return {};
      }
    },
    enabled: propertyIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}