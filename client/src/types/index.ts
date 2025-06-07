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
  InsertUser,
  ChatMessage
} from '@shared/schema';

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
  properties: PropertyWithRelations[];
  pagination: Pagination;
  total: number;
}

// Enhanced property interface that includes relations
export interface PropertyWithRelations extends Property {
  externalId?: string | null | undefined;
  area?: string | null | undefined;
  pricePerSqm?: number | null | undefined;
  propertyType?: string | null;
  marketType?: 'secondary' | 'new_construction' | null;
  source?: string | null;
  autoClassified?: boolean | null;
  manualOverride?: boolean | null;
  isActive?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  region?: {
    id: number;
    name: string;
    regionType: string;
    coordinates?: string | null;
    timezone: string;
    isActive: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  propertyClass?: {
    id: number;
    name: string;
    minPricePerSqm: number;
    maxPricePerSqm: number;
    description?: string | null;
    criteria?: any;
    createdAt: Date | null;
  };
  analytics?: {
    id: number;
    propertyId: number;
    regionId?: number | null;
    roi?: string | null;
    rentalYield?: string | null;
    appreciation?: string | null;
    liquidityScore?: number | null;
    investmentScore?: number | null;
    investmentRating?: string | null;
    priceGrowthRate?: string | null;
    marketTrend?: string | null;
    calculatedAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
  investmentAnalytics?: {
    id: number;
    propertyId: number;
    priceChange1y?: string | null;
    priceChange3m?: string | null;
    priceVolatility?: string | null;
    rentalYield?: string | null;
    rentalIncomeMonthly?: number | null;
    rentalRoiAnnual?: string | null;
    rentalPaybackYears?: string | null;
    flipPotentialProfit?: number | null;
    flipRoi?: string | null;
    flipTimeframeMonths?: number | null;
    renovationCostEstimate?: number | null;
    safeHavenScore?: number | null;
    capitalPreservationIndex?: string | null;
    liquidityScore?: number | null;
    priceForecast3y?: string | null;
    infrastructureImpactScore?: string | null;
    developmentRiskScore?: string | null;
    investmentRating?: string | null;
    riskLevel?: string | null;
    recommendedStrategy?: string | null;
    calculatedAt?: Date | null;
    expiresAt?: Date | null;
  };
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
