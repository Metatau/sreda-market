/**
 * Frontend type definitions with proper null/undefined handling
 */

import type { 
  Property as BaseProperty,
  PropertyWithRelations as BasePropertyWithRelations,
  InvestmentAnalytics as BaseInvestmentAnalytics,
  Region,
  PropertyClass,
  PropertyAnalytics,
  ChatMessage as BaseChatMessage
} from '@shared/schema';

// Frontend-compatible Property type
export interface Property extends Omit<BaseProperty, 'externalId' | 'pricePerSqm' | 'area' | 'coordinates'> {
  externalId: string | null;
  pricePerSqm: number | undefined;
  area: string | undefined;
  coordinates: string | null;
}

// Frontend-compatible PropertyWithRelations type
export interface PropertyWithRelations extends Property {
  region?: Region;
  propertyClass?: PropertyClass;
  analytics?: PropertyAnalytics;
  investmentAnalytics?: InvestmentAnalytics;
}

// Frontend-compatible InvestmentAnalytics type
export interface InvestmentAnalytics extends Omit<BaseInvestmentAnalytics, 'propertyId'> {
  propertyId: number | undefined;
  roi?: number;
  investmentScore?: number;
}

// Frontend-compatible ChatMessage type
export interface ChatMessage extends Omit<BaseChatMessage, 'createdAt'> {
  createdAt: Date | string;
}

// Property filters for search
export interface PropertyFilters {
  regionId?: number;
  propertyClassId?: number;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyType?: string;
  query?: string;
}

// API Response types
export interface PropertiesResponse {
  properties: PropertyWithRelations[];
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Map data types
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
    address?: string;
  };
}

// Chat types
export interface ChatResponse {
  message: string;
  sessionId: string;
  suggestions?: string[];
}

// Investment metrics
export interface InvestmentMetrics {
  roi: number;
  liquidityScore: number;
  investmentRating: string;
  riskLevel: string;
  recommendedStrategy: string;
  potentialReturn: number;
  paybackPeriod: number;
}

// Export shared types that don't need modification
export type { Region, PropertyClass, PropertyAnalytics } from '@shared/schema';