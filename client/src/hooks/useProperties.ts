import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { propertyApi, regionApi, propertyClassApi } from "@/services/api";
import type { SearchFilters } from "@/types";

export function useProperties(filters?: SearchFilters, page: number = 1, perPage: number = 20) {
  return useQuery({
    queryKey: ["properties", filters, page, perPage],
    queryFn: () => propertyApi.getProperties({
      page,
      per_page: perPage,
      region_id: filters?.regionId,
      property_class_id: filters?.propertyClassId,
      min_price: filters?.minPrice,
      max_price: filters?.maxPrice,
      rooms: filters?.rooms,
      property_type: filters?.propertyType,
    }),
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
    queryKey: ["propertyClasses"],
    queryFn: propertyClassApi.getPropertyClasses,
  });
}
