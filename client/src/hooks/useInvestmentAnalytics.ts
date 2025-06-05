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
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
      
      return response.json();
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