/**
 * Shared types for consistent typing across frontend and backend
 */

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    type?: string;
    stack?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    pages: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Property-related types
export interface SearchFilters {
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

export interface GeoJSONCollection {
  type: "FeatureCollection";
  features: MapDataPoint[];
}

// Chat-related types
export interface ChatMessage {
  id?: number;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  metadata?: unknown;
}

export interface ChatResponse {
  message: string;
  sessionId: string;
  suggestions?: string[];
}

// Investment Analytics types
export interface InvestmentMetrics {
  roi: number;
  liquidityScore: number;
  investmentRating: string;
  riskLevel: string;
  recommendedStrategy: string;
  potentialReturn: number;
  paybackPeriod: number;
}

// Component Props types
export interface PropertyMapProps {
  filters: SearchFilters;
  onPropertySelect: (property: any) => void;
  className?: string;
}

export interface AIChatProps {
  onMessage?: (message: string) => void;
  className?: string;
}

// Constants for UI consistency
export const RISK_LEVELS = {
  low: { name: "Низкий", color: "text-green-600" },
  moderate: { name: "Умеренный", color: "text-yellow-600" },
  high: { name: "Высокий", color: "text-red-600" }
} as const;

export const INVESTMENT_STRATEGIES = {
  rental: { name: "Аренда", description: "Долгосрочная аренда" },
  flip: { name: "Перепродажа", description: "Быстрая перепродажа" },
  hold: { name: "Удержание", description: "Долгосрочное владение" }
} as const;

export const PROPERTY_CLASS_COLORS = {
  "Эконом": "bg-blue-100 text-blue-700 border-blue-200",
  "Стандарт": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Комфорт": "bg-amber-100 text-amber-700 border-amber-200",
  "Бизнес": "bg-purple-100 text-purple-700 border-purple-200",
  "Элит": "bg-orange-100 text-orange-700 border-orange-200",
} as const;