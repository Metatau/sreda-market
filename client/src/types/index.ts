export interface Region {
  id: number;
  name: string;
  regionType: string;
  coordinates?: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyClass {
  id: number;
  name: string;
  minPricePerSqm: number;
  maxPricePerSqm: number;
  description?: string;
  criteria?: any;
  createdAt: string;
}

export interface Property {
  id: number;
  externalId?: string;
  regionId?: number;
  propertyClassId?: number;
  title: string;
  description?: string;
  price: number;
  pricePerSqm?: number;
  area?: string;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  address: string;
  district?: string;
  metroStation?: string;
  coordinates?: string;
  propertyType: string;
  source: string;
  url?: string;
  phone?: string;
  autoClassified: boolean;
  manualOverride: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  region?: Region;
  propertyClass?: PropertyClass;
  analytics?: PropertyAnalytics;
}

export interface PropertyAnalytics {
  id: number;
  propertyId: number;
  regionId?: number;
  roi?: string;
  liquidityScore?: number;
  investmentRating?: string;
  priceGrowthRate?: string;
  marketTrend?: string;
  calculatedAt: string;
}

export interface SearchFilters {
  regionId?: number;
  propertyClassId?: number;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  propertyType?: string;
  query?: string;
}

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PropertiesResponse {
  properties: Property[];
  pagination: Pagination;
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
  };
}

export interface ChatMessage {
  id: number;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: any;
  createdAt: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
}
