/**
 * Centralized API hooks to replace scattered API calls
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Property } from '@/types';

export interface PropertyFilters {
  regionId?: number;
  propertyClassId?: number;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyType?: string;
  marketType?: 'secondary' | 'new_construction';
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

/**
 * Hook for fetching properties with filters and pagination
 */
export function useProperties(filters?: PropertyFilters, pagination?: PaginationParams) {
  const queryParams = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }
  
  if (pagination) {
    Object.entries(pagination).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }

  return useQuery({
    queryKey: ['/api/properties', filters, pagination],
    queryFn: async () => {
      const url = `/api/properties?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching a single property
 */
export function useProperty(id: number) {
  return useQuery({
    queryKey: ['/api/properties', id],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${id}`);
      if (!response.ok) throw new Error('Failed to fetch property');
      return response.json();
    },
    enabled: !!id,
  });
}

/**
 * Hook for property search
 */
export function usePropertySearch(query: string, filters?: Partial<PropertyFilters>) {
  const queryParams = new URLSearchParams({ q: query });
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }

  return useQuery({
    queryKey: ['/api/properties/search', query, filters],
    queryFn: async () => {
      const url = `/api/properties/search?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to search properties');
      return response.json();
    },
    enabled: !!query.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for map data
 */
export function useMapData(filters?: Partial<PropertyFilters>) {
  const queryParams = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }

  return useQuery({
    queryKey: ['/api/properties/map-data', filters],
    queryFn: async () => {
      const url = `/api/properties/map-data?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch map data');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for regions
 */
export function useRegions() {
  return useQuery({
    queryKey: ['/api/regions'],
    queryFn: async () => {
      const response = await fetch('/api/regions');
      if (!response.ok) throw new Error('Failed to fetch regions');
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for property classes
 */
export function usePropertyClasses() {
  return useQuery({
    queryKey: ['/api/property-classes'],
    queryFn: async () => {
      const response = await fetch('/api/property-classes');
      if (!response.ok) throw new Error('Failed to fetch property classes');
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for AI chat
 */
export function useAIChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ message, sessionId, context }: { 
      message: string; 
      sessionId: string; 
      context?: any 
    }) => {
      const response = await apiRequest('POST', '/api/ai/chat', {
        message,
        sessionId,
        context
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate chat history cache
      queryClient.invalidateQueries({ queryKey: ['/api/ai/chat/history'] });
    }
  });
}

/**
 * Hook for AI recommendations
 */
export function useAIRecommendations() {
  return useMutation({
    mutationFn: async ({ preferences, budget, region }: {
      preferences: any;
      budget?: number;
      region?: string;
    }) => {
      const response = await apiRequest('POST', '/api/ai/recommendations', {
        preferences,
        budget,
        region
      });
      return response.json();
    }
  });
}