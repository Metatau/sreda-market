// Расширенные типы для геоаналитики недвижимости

// Демографические показатели
export interface Demographics {
  population: {
    density: number; // чел/км²
    total: number;
    growth_forecast: 'increase' | 'decrease' | 'stable';
  };
  structure: {
    average_age: number;
    family_composition: {
      singles: number; // %
      families_with_children: number; // %
      elderly: number; // %
    };
    income_level: 'low' | 'medium' | 'high' | 'mixed';
  };
}

// Транспортная доступность
export interface TransportAccessibility {
  pedestrian_traffic: 'low' | 'medium' | 'high';
  car_traffic: 'low' | 'medium' | 'high';
  metro_distance: number; // метры
  public_transport_stops: {
    bus_stops: number;
    nearest_distance: number; // метры
  };
  major_roads_distance: number; // метры
}

// Инфраструктурная обеспеченность
export interface InfrastructureData {
  education: {
    schools: number;
    kindergartens: number;
    nearest_school_distance: number; // метры
  };
  healthcare: {
    hospitals: number;
    clinics: number;
    nearest_medical_distance: number; // метры
  };
  commercial: {
    shopping_centers: number;
    shops: number;
    restaurants: number;
  };
  recreation: {
    parks: number;
    sports_facilities: number;
    nearest_park_distance: number; // метры
  };
  infrastructure_score: number; // 0-100
}

// Конкурентное окружение
export interface CompetitionData {
  new_buildings: number;
  secondary_housing: number;
  total_competing_objects: number;
}

// Экономические показатели
export interface EconomicData {
  price_per_sqm: {
    economy_class: number;
    comfort_class: number;
    business_class: number;
    elite_class: number;
  };
  price_dynamics: {
    yearly_change: number; // %
    trend: 'growing' | 'falling' | 'stable';
  };
  market_activity: {
    average_sale_time: number; // дней
    demand_level: 'low' | 'medium' | 'high';
    sales_velocity: number; // объектов/месяц
  };
  demand_forecast: 'increasing' | 'decreasing' | 'stable';
}

// Аналитические данные от Perplexity
export interface PerplexityInsights {
  market_sentiment: string; // Общее настроение рынка в районе
  development_projects: string[]; // Планируемые проекты развития
  investment_attractiveness: number; // 0-100
  unique_location_features: string[]; // Уникальные особенности локации
  expert_opinion: string; // Экспертная оценка района
  future_trends: string[]; // Прогнозируемые тренды развития
}

// Главный интерфейс квартальной аналитики
export interface QuarterAnalytics {
  demographics: Demographics;
  transport: TransportAccessibility;
  infrastructure: InfrastructureData;
  competition: CompetitionData;
  economics: EconomicData;
  perplexity_insights?: PerplexityInsights;
}

// Расширенная аналитика с AI-инсайтами
export interface EnhancedQuarterAnalytics extends QuarterAnalytics {
  ai_insights: {
    summary: string; // Краткая сводка по району
    strengths: string[]; // Сильные стороны локации
    weaknesses: string[]; // Слабые стороны
    opportunities: string[]; // Возможности для инвестиций
    threats: string[]; // Потенциальные риски
    investment_recommendation: 'buy' | 'hold' | 'avoid';
    confidence_score: number; // 0-100
  };
}

// Границы для запросов
export interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

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