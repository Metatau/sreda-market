
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

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }
    
    const data = await response.json();
    return data.data || data; // Support both new and old response formats
  }

  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const url = `${API_BASE}${endpoint}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url);
    return this.handleResponse<T>(response);
  }

  private async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await apiRequest("POST", `${API_BASE}${endpoint}`, data);
    return this.handleResponse<T>(response);
  }

  // Region API
  async getRegions(): Promise<Region[]> {
    return this.get<Region[]>("/regions");
  }

  async getRegion(id: number): Promise<Region & { analytics: any }> {
    return this.get<Region & { analytics: any }>(`/regions/${id}`);
  }

  // Property Class API
  async getPropertyClasses(): Promise<PropertyClass[]> {
    return this.get<PropertyClass[]>("/property-classes");
  }

  // Property API
  async getProperties(params?: {
    page?: number;
    per_page?: number;
    region_id?: number;
    property_class_id?: number;
    min_price?: number;
    max_price?: number;
    rooms?: number;
    property_type?: string;
    market_type?: string;
  }): Promise<PropertiesResponse> {
    return this.get<PropertiesResponse>("/properties", params);
  }

  async getProperty(id: number): Promise<Property> {
    return this.get<Property>(`/properties/${id}`);
  }

  async searchProperties(filters: SearchFilters): Promise<{ properties: Property[]; total: number }> {
    return this.post<{ properties: Property[]; total: number }>("/properties/search", filters);
  }

  async getMapData(params?: {
    region_id?: number;
    property_class_id?: number;
  }): Promise<{ type: "FeatureCollection"; features: MapDataPoint[] }> {
    return this.get<{ type: "FeatureCollection"; features: MapDataPoint[] }>("/properties/map-data", params);
  }

  // Chat API
  async sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    return this.post<ChatResponse>("/chat", { message, sessionId });
  }

  // Analytics API
  async getDistrictAnalytics(): Promise<any[]> {
    return this.get<any[]>("/analytics/districts");
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export individual API modules for backward compatibility
export const regionApi = {
  getRegions: () => apiClient.getRegions(),
  getRegion: (id: number) => apiClient.getRegion(id),
};

export const propertyClassApi = {
  getPropertyClasses: () => apiClient.getPropertyClasses(),
};

export const propertyApi = {
  getProperties: (params?: any) => apiClient.getProperties(params),
  getProperty: (id: number) => apiClient.getProperty(id),
  searchProperties: (filters: SearchFilters) => apiClient.searchProperties(filters),
  getMapData: (params?: any) => apiClient.getMapData(params),
};

export const chatApi = {
  sendMessage: (message: string, sessionId?: string) => apiClient.sendMessage(message, sessionId),
};

export const analyticsApi = {
  getDistrictAnalytics: () => apiClient.getDistrictAnalytics(),
};

// Export the main client for direct use
export { apiClient };
