// Import types from shared schema to eliminate duplication
export type {
  Region,
  PropertyClass,
  Property,
  PropertyAnalytics,
  InvestmentAnalytics,
  User,
  PriceHistory,
  InfrastructureProject,
  InsertRegion,
  InsertPropertyClass,
  InsertProperty,
  InsertPropertyAnalytics,
  InsertInvestmentAnalytics,
  InsertChatMessage,
  InsertUser
} from '@shared/schema';

// Re-export ChatMessage with alias to avoid conflicts
export type { ChatMessage as SharedChatMessage } from '@shared/schema';

export interface SearchFilters {
  regionId?: number;
  propertyClassId?: number;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyType?: string;
  marketType?: 'secondary' | 'new_construction';
  query?: string;
}

// Alias for backward compatibility
export type PropertyFilters = SearchFilters;

export interface Pagination {
  page: number;
  perPage: number;
  total?: number;
  pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface PropertiesResponse {
  properties: Property[];
  pagination: Pagination;
  total: number;
}

export interface PropertyWithRelations extends Property {
  region?: Region;
  propertyClass?: PropertyClass;
  analytics?: PropertyAnalytics;
  investmentAnalytics?: InvestmentAnalytics;
}

export interface MapDataPoint {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: number;
    title: string;
    price: number;
    pricePerSqm?: number;
    propertyClass?: string;
    rooms?: number;
    area?: string;
    investmentScore?: number;
    roi?: string;
    liquidityScore?: number;
    investmentRating?: string;
  };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface HeatmapData {
  lat: number;
  lng: number;
  intensity: number;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  entities?: any;
}
