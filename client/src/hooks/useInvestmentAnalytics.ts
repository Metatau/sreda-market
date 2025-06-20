import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface InvestmentAnalytics {
  id?: number;
  propertyId?: number;
  priceChange1y?: string;
  priceChange3m?: string;
  priceVolatility?: string;
  rentalYield?: string;
  rentalIncomeMonthly?: number;
  rentalRoiAnnual?: string;
  rentalPaybackYears?: string;
  flipPotentialProfit?: number;
  flipRoi?: string;
  flipTimeframeMonths?: number;
  renovationCostEstimate?: number;
  safeHavenScore?: number;
  capitalPreservationIndex?: string;
  liquidityScore?: number;
  priceForecast3y?: string;
  infrastructureImpactScore?: string;
  developmentRiskScore?: string;
  investmentRating?: string;
  riskLevel?: string;
  recommendedStrategy?: string;
  calculatedAt?: string;
  expiresAt?: string;
}

export function useInvestmentAnalytics(propertyId: number) {
  return useQuery<InvestmentAnalytics>({
    queryKey: ['/api/investment-analytics', propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/investment-analytics?propertyId=${propertyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch investment analytics');
      }
      return response.json();
    },
    enabled: !!propertyId && propertyId > 0,
    staleTime: 30 * 60 * 1000, // 30 минут для инвестиционной аналитики
    gcTime: 60 * 60 * 1000, // 1 час
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });
}

export function useCalculateInvestmentAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: number): Promise<InvestmentAnalytics> => {
      const response = await fetch(`/api/investment-analytics/${propertyId}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate analytics');
      }
      
      const result = await response.json();
      return result.data || result; // Handle both wrapped and unwrapped responses
    },
    onSuccess: (data, propertyId) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/investment-analytics', propertyId],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/properties'],
      });
    },
  });
}

export function useBatchCalculateAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyIds: number[]): Promise<{ results: any[] }> => {
      const response = await fetch('/api/investment-analytics/batch-calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch calculate analytics');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/investment-analytics'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/properties'],
      });
    },
  });
}