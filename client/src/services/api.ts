import { apiRequest } from "@/lib/queryClient";
import type {
  Region,
  PropertyClass,
  Property,
  SearchFilters,
  PropertiesResponse,
  MapDataPoint,
  ChatResponse,
} from "@/types";

const API_BASE = "/api";

export const regionApi = {
  getRegions: async (): Promise<Region[]> => {
    const response = await fetch(`${API_BASE}/regions`);
    if (!response.ok) throw new Error("Failed to fetch regions");
    return response.json();
  },

  getRegion: async (id: number): Promise<Region & { analytics: any }> => {
    const response = await fetch(`${API_BASE}/regions/${id}`);
    if (!response.ok) throw new Error("Failed to fetch region");
    return response.json();
  },
};

export const propertyClassApi = {
  getPropertyClasses: async (): Promise<PropertyClass[]> => {
    const response = await fetch(`${API_BASE}/property-classes`);
    if (!response.ok) throw new Error("Failed to fetch property classes");
    return response.json();
  },
};

export const propertyApi = {
  getProperties: async (params?: {
    page?: number;
    per_page?: number;
    region_id?: number;
    property_class_id?: number;
    min_price?: number;
    max_price?: number;
    rooms?: number;
    property_type?: string;
  }): Promise<PropertiesResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${API_BASE}/properties?${searchParams}`);
    if (!response.ok) throw new Error("Failed to fetch properties");
    return response.json();
  },

  getProperty: async (id: number): Promise<Property> => {
    const response = await fetch(`${API_BASE}/properties/${id}`);
    if (!response.ok) throw new Error("Failed to fetch property");
    return response.json();
  },

  searchProperties: async (filters: SearchFilters): Promise<{ properties: Property[]; total: number }> => {
    const response = await apiRequest("POST", `${API_BASE}/properties/search`, filters);
    return response.json();
  },

  getMapData: async (params?: {
    region_id?: number;
    property_class_id?: number;
  }): Promise<{ type: "FeatureCollection"; features: MapDataPoint[] }> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${API_BASE}/properties/map-data?${searchParams}`);
    if (!response.ok) throw new Error("Failed to fetch map data");
    return response.json();
  },
};

export const chatApi = {
  sendMessage: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await apiRequest("POST", `${API_BASE}/chat`, { message, sessionId });
    return response.json();
  },
};

export const analyticsApi = {
  getDistrictAnalytics: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE}/analytics/districts`);
    if (!response.ok) throw new Error("Failed to fetch analytics");
    return response.json();
  },
};
