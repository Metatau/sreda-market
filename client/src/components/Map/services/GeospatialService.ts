import { AdvancedHeatmapMode, HeatmapDataPoint, GeospatialStats, MeasurementResult } from '../types/geospatial';
import type { PropertyWithRelations } from '@/types';

export class GeospatialService {
  /**
   * Генерирует данные для тепловой карты на основе выбранного режима
   */
  static generateHeatmapData(
    properties: PropertyWithRelations[], 
    mode: AdvancedHeatmapMode
  ): HeatmapDataPoint[] {
    if (!properties || properties.length === 0) return [];

    return properties
      .filter(property => property.coordinates && property.coordinates !== '')
      .map(property => {
        const coords = this.parseCoordinates(property.coordinates);
        if (!coords) return null;

        const value = this.calculateHeatmapValue(property, mode);
        const weight = this.calculateWeight(property, mode);

        return {
          lat: coords.lat,
          lon: coords.lon,
          value,
          weight,
          metadata: {
            propertyId: property.id,
            address: property.address,
            price: property.price || 0,
            area: parseFloat(property.area || '0'),
            roi: property.investmentAnalytics?.roi || 0,
            liquidity: property.investmentAnalytics?.liquidityScore || 0
          }
        };
      })
      .filter(Boolean) as HeatmapDataPoint[];
  }

  /**
   * Парсит координаты из строки
   */
  private static parseCoordinates(coordinates: string): { lat: number; lon: number } | null {
    try {
      if (coordinates.includes(',')) {
        const [lat, lon] = coordinates.split(',').map(c => parseFloat(c.trim()));
        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }
      
      // Попытка парсинга как JSON
      const parsed = JSON.parse(coordinates);
      if (parsed.lat && parsed.lon) {
        return { lat: parseFloat(parsed.lat), lon: parseFloat(parsed.lon) };
      }
    } catch (error) {
      console.warn('Failed to parse coordinates:', coordinates);
    }
    return null;
  }

  /**
   * Вычисляет значение для тепловой карты в зависимости от режима
   */
  private static calculateHeatmapValue(property: PropertyWithRelations, mode: AdvancedHeatmapMode): number {
    switch (mode) {
      case 'price_per_sqm':
        return property.pricePerSqm || 0;

      case 'roi_potential':
        return property.investmentAnalytics?.roi || 0;

      case 'liquidity_index':
        return property.investmentAnalytics?.liquidityScore || 0;

      case 'price_growth_trend':
        // Симуляция тренда роста цен (в реальном проекте данные из API)
        return Math.random() * 20 - 10; // от -10% до +10%

      case 'rental_yield':
        // Расчет доходности аренды
        const price = property.price || 0;
        const area = parseFloat(property.area || '0');
        const avgRentPerSqm = this.getAverageRentPerSqm(property.regionId || 0);
        return price > 0 ? (avgRentPerSqm * area * 12) / price * 100 : 0;

      case 'infrastructure_score':
        return this.calculateInfrastructureScore(property);

      case 'transport_accessibility':
        return this.calculateTransportScore(property);

      case 'demographic_density':
        return this.getDemographicDensity(property.regionId || 0);

      case 'investment_risk':
        return this.calculateInvestmentRisk(property);

      case 'market_activity':
        return this.getMarketActivity(property.regionId || 0);

      default:
        return property.price || 0;
    }
  }

  /**
   * Вычисляет вес точки для тепловой карты
   */
  private static calculateWeight(property: PropertyWithRelations, mode: AdvancedHeatmapMode): number {
    const baseWeight = 1;
    const area = parseFloat(property.area || '0');
    
    switch (mode) {
      case 'price_per_sqm':
      case 'roi_potential':
      case 'liquidity_index':
        return Math.max(0.1, Math.min(2, area / 100)); // Вес от 0.1 до 2 в зависимости от площади

      case 'demographic_density':
        return 1.5; // Высокий вес для демографических данных

      default:
        return baseWeight;
    }
  }

  /**
   * Вычисляет статистику для выбранной области
   */
  static calculateAreaStats(properties: PropertyWithRelations[], bounds?: any): GeospatialStats {
    if (!properties || properties.length === 0) {
      return this.getEmptyStats();
    }

    const filteredProperties = bounds ? 
      properties.filter(p => this.isPropertyInBounds(p, bounds)) : 
      properties;

    const prices = filteredProperties.map(p => p.price || 0).filter(p => p > 0);
    const pricesPerSqm = filteredProperties.map(p => p.pricePerSqm || 0).filter(p => p > 0);
    const areas = filteredProperties.map(p => parseFloat(p.area || '0')).filter(a => a > 0);

    const totalProperties = filteredProperties.length;
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const averagePricePerSqm = pricesPerSqm.length > 0 ? pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length : 0;
    const totalArea = areas.reduce((a, b) => a + b, 0);

    return {
      selectedArea: {
        totalProperties,
        averagePrice,
        priceRange: prices.length > 0 ? [Math.min(...prices), Math.max(...prices)] : [0, 0],
        averagePricePerSqm,
        investmentScore: this.calculateAverageInvestmentScore(filteredProperties),
        liquidityIndex: this.calculateAverageLiquidity(filteredProperties),
        totalArea
      },
      comparison: {
        cityAverage: averagePrice * 1.15, // Примерное сравнение
        regionAverage: averagePrice * 0.95,
        percentile: this.calculatePercentile(averagePrice, prices),
        ranking: Math.floor(Math.random() * 50) + 1 // Временная заглушка
      },
      trends: {
        priceGrowth6m: Math.random() * 20 - 10,
        priceGrowth1y: Math.random() * 30 - 15,
        demandTrend: this.calculateDemandTrend(filteredProperties),
        marketActivity: this.calculateMarketActivity(filteredProperties)
      }
    };
  }

  /**
   * Вычисляет расстояние между двумя точками (формула гаверсинуса)
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): MeasurementResult {
    const R = 6371; // Радиус Земли в км
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return {
      type: 'distance',
      value: distance,
      unit: distance < 1 ? 'метров' : 'километров',
      formattedValue: distance < 1 ? 
        `${Math.round(distance * 1000)} м` : 
        `${distance.toFixed(2)} км`
    };
  }

  /**
   * Вычисляет площадь полигона
   */
  static calculatePolygonArea(coordinates: [number, number][]): MeasurementResult {
    if (coordinates.length < 3) {
      return { type: 'area', value: 0, unit: 'м²', formattedValue: '0 м²' };
    }

    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coordinates[i][0] * coordinates[j][1];
      area -= coordinates[j][0] * coordinates[i][1];
    }

    area = Math.abs(area) / 2;
    
    // Приблизительное преобразование в м² (для небольших областей)
    const areaInSqM = area * 111000 * 111000 * Math.cos(this.deg2rad(coordinates[0][0]));

    return {
      type: 'area',
      value: areaInSqM,
      unit: areaInSqM > 1000000 ? 'км²' : 'м²',
      formattedValue: areaInSqM > 1000000 ? 
        `${(areaInSqM / 1000000).toFixed(2)} км²` : 
        `${Math.round(areaInSqM)} м²`
    };
  }

  // Вспомогательные методы

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static getEmptyStats(): GeospatialStats {
    return {
      selectedArea: {
        totalProperties: 0,
        averagePrice: 0,
        priceRange: [0, 0],
        averagePricePerSqm: 0,
        investmentScore: 0,
        liquidityIndex: 0,
        totalArea: 0
      },
      comparison: {
        cityAverage: 0,
        regionAverage: 0,
        percentile: 0,
        ranking: 0
      },
      trends: {
        priceGrowth6m: 0,
        priceGrowth1y: 0,
        demandTrend: 'stable',
        marketActivity: 'medium'
      }
    };
  }

  private static getAverageRentPerSqm(regionId: number): number {
    // В реальном приложении данные из API
    const rentData: Record<number, number> = {
      1: 1500, // Москва
      2: 800,  // СПб
      3: 600,  // Екатеринбург
      4: 500   // Другие
    };
    return rentData[regionId] || 400;
  }

  private static calculateInfrastructureScore(property: PropertyWithRelations): number {
    // Базовая оценка инфраструктуры (в реальности - сложный алгоритм)
    let score = 50; // Базовая оценка
    
    // Бонус за центральные районы
    if (property.address.toLowerCase().includes('центр')) score += 20;
    if (property.address.toLowerCase().includes('метро')) score += 15;
    
    return Math.min(100, score + Math.random() * 20);
  }

  private static calculateTransportScore(property: PropertyWithRelations): number {
    let score = 30; // Базовая оценка
    
    if (property.address.toLowerCase().includes('метро')) score += 40;
    if (property.address.toLowerCase().includes('остановка')) score += 20;
    
    return Math.min(100, score + Math.random() * 30);
  }

  private static getDemographicDensity(regionId: number): number {
    const densityData: Record<number, number> = {
      1: 4500, // Москва - высокая плотность
      2: 3800, // СПб
      3: 2200, // Екатеринбург
      4: 1500  // Другие города
    };
    return densityData[regionId] || 1000;
  }

  private static calculateInvestmentRisk(property: PropertyWithRelations): number {
    let risk = 50; // Базовый риск
    
    // Снижение риска для центральных районов
    if (property.address.toLowerCase().includes('центр')) risk -= 20;
    
    // Увеличение риска для удаленных районов
    if (property.address.toLowerCase().includes('окраина')) risk += 15;
    
    return Math.max(0, Math.min(100, risk + Math.random() * 20 - 10));
  }

  private static getMarketActivity(regionId: number): number {
    // Активность рынка (количество сделок)
    return 20 + Math.random() * 60;
  }

  private static isPropertyInBounds(property: PropertyWithRelations, bounds: any): boolean {
    const coords = this.parseCoordinates(property.coordinates || '');
    if (!coords) return false;
    
    return coords.lat >= bounds.south && coords.lat <= bounds.north &&
           coords.lon >= bounds.west && coords.lon <= bounds.east;
  }

  private static calculateAverageInvestmentScore(properties: PropertyWithRelations[]): number {
    const scores = properties
      .map(p => p.investmentAnalytics?.investmentScore || 0)
      .filter(s => s > 0);
    
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  private static calculateAverageLiquidity(properties: PropertyWithRelations[]): number {
    const liquidities = properties
      .map(p => p.investmentAnalytics?.liquidityScore || 0)
      .filter(l => l > 0);
    
    return liquidities.length > 0 ? liquidities.reduce((a, b) => a + b, 0) / liquidities.length : 0;
  }

  private static calculatePercentile(value: number, dataset: number[]): number {
    if (dataset.length === 0) return 0;
    
    const sorted = [...dataset].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }

  private static calculateDemandTrend(properties: PropertyWithRelations[]): 'rising' | 'stable' | 'declining' {
    // Анализ тренда спроса (упрощенный)
    const avgPrice = properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length;
    const random = Math.random();
    
    if (avgPrice > 5000000) return random > 0.7 ? 'rising' : 'stable';
    if (avgPrice > 2000000) return random > 0.5 ? 'stable' : 'rising';
    return random > 0.6 ? 'rising' : 'stable';
  }

  private static calculateMarketActivity(properties: PropertyWithRelations[]): 'high' | 'medium' | 'low' {
    const totalProperties = properties.length;
    
    if (totalProperties > 100) return 'high';
    if (totalProperties > 30) return 'medium';
    return 'low';
  }
}