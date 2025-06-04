import { useQuery } from "@tanstack/react-query";
import { regionApi, propertyClassApi } from "@/services/api";

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: regionApi.getRegions,
  });
}

export function useRegion(id: number) {
  return useQuery({
    queryKey: ["regions", id],
    queryFn: () => regionApi.getRegion(id),
    enabled: !!id,
  });
}

export function usePropertyClasses() {
  return useQuery({
    queryKey: ["property-classes"],
    queryFn: propertyClassApi.getPropertyClasses,
  });
}
