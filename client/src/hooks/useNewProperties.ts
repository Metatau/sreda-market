import { useQuery } from "@tanstack/react-query";

interface NewPropertiesResponse {
  count: number;
  period: string;
  timestamp: string;
}

export function useNewProperties() {
  return useQuery<NewPropertiesResponse>({
    queryKey: ["/api/analytics/new-properties"],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for real-time updates
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
}