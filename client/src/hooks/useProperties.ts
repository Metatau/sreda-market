import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { propertyApi, regionApi, propertyClassApi } from "@/services/api";
import type { SearchFilters } from "@/types";

export function useAISearch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (query: string) => {
      // TODO: Implement AI search API call
      return {
        filters: {} as SearchFilters,
        recommendations: {
          reasoning: "AI search functionality will be implemented when API keys are provided"
        }
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useProperties(filters?: SearchFilters, page: number = 1, perPage: number = 20) {
  return useQuery({
    queryKey: ["properties", filters, page, perPage],
    queryFn: () => {
      console.log('useProperties API call with filters:', filters);
      return propertyApi.getProperties({
        page,
        per_page: perPage,
        region_id: filters?.regionId,
        property_class_id: filters?.propertyClassId,
        min_price: filters?.minPrice,
        max_price: filters?.maxPrice,
        rooms: filters?.rooms,
        property_type: filters?.propertyType,
        market_type: filters?.marketType,
      });
    },
  });
}

export function useAllProperties() {
  return useQuery({
    queryKey: ["allProperties"],
    queryFn: () => propertyApi.getProperties({ 
      page: 1, 
      per_page: 100 // Загрузить больше объектов для карты
    }),
    staleTime: 5 * 60 * 1000, // Кешировать на 5 минут
  });
}

export function useProperty(id: number) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => propertyApi.getProperty(id),
    enabled: !!id,
  });
}

export function useSearchProperties() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (filters: SearchFilters) => propertyApi.searchProperties(filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useMapData(filters?: { regionId?: number; propertyClassId?: number }) {
  return useQuery({
    queryKey: ["mapData", filters],
    queryFn: () => propertyApi.getMapData({
      region_id: filters?.regionId,
      property_class_id: filters?.propertyClassId,
    }),
  });
}

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: regionApi.getRegions,
  });
}

export function usePropertyClasses() {
  return useQuery({
    queryKey: ["property-classes"],
    queryFn: propertyClassApi.getPropertyClasses,
  });
}
