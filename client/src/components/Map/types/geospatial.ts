// Расширенные типы для геоаналитики

export type AdvancedHeatmapMode = 
  | 'none'
  | 'price_per_sqm'           // Цена за м²
  | 'roi_potential'           // ROI потенциал
  | 'liquidity_index'         // Индекс ликвидности
  | 'price_growth_trend'      // Тренд роста цен
  | 'rental_yield'            // Доходность аренды
  | 'infrastructure_score'    // Оценка инфраструктуры
  | 'transport_accessibility' // Транспортная доступность
  | 'demographic_density'     // Демографическая плотность
  | 'investment_risk'         // Инвестиционный риск
  | 'market_activity';        // Активность рынка

export interface HeatmapDataPoint {
  lat: number;
  lon: number;
  value: number;
  weight: number;
  metadata?: {
    propertyId?: number;
    address?: string;
    price?: number;
    area?: number;
    roi?: number;
    liquidity?: number;
  };
}

export interface GeospatialStats {
  selectedArea: {
    totalProperties: number;
    averagePrice: number;
    priceRange: [number, number];
    averagePricePerSqm: number;
    investmentScore: number;
    liquidityIndex: number;
    totalArea: number; // в м²
  };
  comparison: {
    cityAverage: number;
    regionAverage: number;
    percentile: number;
    ranking: number; // из общего количества районов
  };
  trends: {
    priceGrowth6m: number;
    priceGrowth1y: number;
    demandTrend: 'rising' | 'stable' | 'declining';
    marketActivity: 'high' | 'medium' | 'low';
  };
}

export interface DrawingTool {
  type: 'polygon' | 'circle' | 'rectangle' | 'line';
  isActive: boolean;
  data?: any;
}

export interface MeasurementResult {
  type: 'distance' | 'area';
  value: number;
  unit: string;
  formattedValue: string;
}

export interface SpatialAnalysisOptions {
  analysisType: 'buffer' | 'intersection' | 'proximity' | 'cluster';
  parameters: {
    radius?: number; // для buffer и proximity
    units?: 'meters' | 'kilometers';
    threshold?: number; // для кластеризации
  };
}

export interface LayerConfig {
  id: string;
  name: string;
  type: 'heatmap' | 'points' | 'polygons' | 'lines';
  visible: boolean;
  opacity: number;
  zIndex: number;
  style?: any;
}

export interface GeospatialFilter {
  property: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in';
  value: any;
  enabled: boolean;
}