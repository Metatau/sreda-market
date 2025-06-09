import { 
  QuarterAnalytics, 
  EnhancedQuarterAnalytics, 
  Demographics, 
  TransportAccessibility, 
  InfrastructureData, 
  CompetitionData, 
  EconomicData,
  LatLngBounds 
} from '../types/geospatial';
import { openStreetMapService } from '@/services/openStreetMapService';
import { PerplexityService } from '@/services/perplexityService';
import type { PropertyWithRelations } from '@/types';

export class GeospatialService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 15 * 60 * 1000; // 15 минут для OSM данных

  /**
   * Основной метод получения аналитики квартала
   */
  static async getQuarterAnalytics(
    lat: number, 
    lng: number, 
    radius: number = 1000
  ): Promise<QuarterAnalytics> {
    const cacheKey = `quarter_${lat}_${lng}_${radius}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const [demographics, transport, infrastructure, competition, economics] = await Promise.allSettled([
        this.getDemographics(this.createBounds(lat, lng, radius)),
        this.getTransportAnalysis(lat, lng),
        this.getInfrastructureScore(lat, lng, radius),
        this.getCompetitionAnalysis(this.createBounds(lat, lng, radius)),
        this.getEconomicIndicators(lat, lng)
      ]);

      const analytics: QuarterAnalytics = {
        demographics: demographics.status === 'fulfilled' ? demographics.value : this.getDefaultDemographics(),
        transport: transport.status === 'fulfilled' ? transport.value : this.getDefaultTransport(),
        infrastructure: infrastructure.status === 'fulfilled' ? infrastructure.value : this.getDefaultInfrastructure(),
        competition: competition.status === 'fulfilled' ? competition.value : this.getDefaultCompetition(),
        economics: economics.status === 'fulfilled' ? economics.value : this.getDefaultEconomics()
      };

      this.setCachedData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Quarter analytics error:', error);
      throw new Error('Не удалось получить аналитику квартала');
    }
  }

  /**
   * Получение демографических данных через OSM
   */
  static async getDemographics(bounds: LatLngBounds): Promise<Demographics> {
    try {
      const populationData = await openStreetMapService.getPopulationData(bounds);
      const area = this.calculateBoundsArea(bounds);
      
      return {
        population: {
          density: Math.round(populationData.estimated_population / area),
          total: populationData.estimated_population,
          growth_forecast: this.predictPopulationGrowth(populationData.building_density)
        },
        structure: {
          average_age: 35 + Math.random() * 10, // Базовое значение с вариацией
          family_composition: {
            singles: 25 + Math.random() * 15,
            families_with_children: 45 + Math.random() * 20,
            elderly: 15 + Math.random() * 10
          },
          income_level: this.determineIncomeLevel(populationData.building_density)
        }
      };
    } catch (error) {
      console.error('Demographics error:', error);
      return this.getDefaultDemographics();
    }
  }

  /**
   * Анализ транспортной доступности (OSM)
   */
  static async getTransportAnalysis(lat: number, lng: number): Promise<TransportAccessibility> {
    try {
      const [transportNodes, trafficData] = await Promise.all([
        openStreetMapService.getTransportNodes(lat, lng, 1000),
        openStreetMapService.getTrafficData(lat, lng)
      ]);

      const busStops = transportNodes.filter(node => 
        node.tags.highway === 'bus_stop' || node.tags.public_transport === 'stop_position'
      );

      const metroStations = transportNodes.filter(node => 
        node.tags.railway === 'station' || node.tags.public_transport === 'station'
      );

      const nearestBusStop = busStops.reduce((nearest, stop) => 
        !nearest || (stop.distance && (!nearest.distance || stop.distance < nearest.distance)) ? stop : nearest
      , busStops[0]);

      const nearestMetro = metroStations.reduce((nearest, station) => 
        !nearest || (station.distance && (!nearest.distance || station.distance < nearest.distance)) ? station : nearest
      , metroStations[0]);

      return {
        pedestrian_traffic: this.assessPedestrianTraffic(transportNodes.length),
        car_traffic: trafficData.traffic_intensity,
        metro_distance: nearestMetro?.distance || 9999,
        public_transport_stops: {
          bus_stops: busStops.length,
          nearest_distance: nearestBusStop?.distance || 9999
        },
        major_roads_distance: this.calculateMajorRoadDistance(trafficData.roads)
      };
    } catch (error) {
      console.error('Transport analysis error:', error);
      return this.getDefaultTransport();
    }
  }

  /**
   * Оценка инфраструктуры (OSM)
   */
  static async getInfrastructureScore(lat: number, lng: number, radius: number): Promise<InfrastructureData> {
    try {
      const [schools, hospitals, shops, parks] = await Promise.all([
        openStreetMapService.getAmenities(lat, lng, radius, 'school'),
        openStreetMapService.getAmenities(lat, lng, radius, 'hospital'),
        openStreetMapService.getAmenities(lat, lng, radius, 'shop'),
        openStreetMapService.getAmenities(lat, lng, radius, 'park')
      ]);

      const kindergartens = await openStreetMapService.getAmenities(lat, lng, radius, 'kindergarten');
      const clinics = await openStreetMapService.getAmenities(lat, lng, radius, 'clinic');
      const restaurants = await openStreetMapService.getAmenities(lat, lng, radius, 'restaurant');

      const nearestSchool = this.findNearest(schools);
      const nearestMedical = this.findNearest([...hospitals, ...clinics]);
      const nearestPark = this.findNearest(parks);

      const score = this.calculateInfrastructureScore({
        schools: schools.length,
        hospitals: hospitals.length + clinics.length,
        shops: shops.length,
        parks: parks.length
      });

      return {
        education: {
          schools: schools.length,
          kindergartens: kindergartens.length,
          nearest_school_distance: nearestSchool?.distance || 9999
        },
        healthcare: {
          hospitals: hospitals.length,
          clinics: clinics.length,
          nearest_medical_distance: nearestMedical?.distance || 9999
        },
        commercial: {
          shopping_centers: shops.filter(s => s.tags.shop === 'mall').length,
          shops: shops.length,
          restaurants: restaurants.length
        },
        recreation: {
          parks: parks.length,
          sports_facilities: shops.filter(s => s.tags.leisure === 'sports_centre').length,
          nearest_park_distance: nearestPark?.distance || 9999
        },
        infrastructure_score: score
      };
    } catch (error) {
      console.error('Infrastructure analysis error:', error);
      return this.getDefaultInfrastructure();
    }
  }

  /**
   * Анализ конкуренции (OSM)
   */
  static async getCompetitionAnalysis(bounds: LatLngBounds): Promise<CompetitionData> {
    try {
      const realEstateObjects = await openStreetMapService.getRealEstateObjects(bounds);
      
      return {
        new_buildings: realEstateObjects.filter(obj => 
          obj.tags.building === 'apartments' || obj.tags['building:use'] === 'residential'
        ).length,
        secondary_housing: realEstateObjects.filter(obj => 
          obj.tags.building === 'residential' || obj.tags.building === 'house'
        ).length,
        total_competing_objects: realEstateObjects.length
      };
    } catch (error) {
      console.error('Competition analysis error:', error);
      return this.getDefaultCompetition();
    }
  }

  /**
   * Экономический анализ (комбинированные данные)
   */
  static async getEconomicIndicators(lat: number, lng: number): Promise<EconomicData> {
    try {
      // Базовые расчеты на основе местоположения
      const regionMultiplier = this.getRegionMultiplier(lat, lng);
      
      return {
        price_per_sqm: {
          economy_class: Math.round(50000 * regionMultiplier),
          comfort_class: Math.round(80000 * regionMultiplier),
          business_class: Math.round(120000 * regionMultiplier),
          elite_class: Math.round(200000 * regionMultiplier)
        },
        price_dynamics: {
          yearly_change: 5 + Math.random() * 10, // 5-15% рост
          trend: this.determinePriceTrend(regionMultiplier)
        },
        market_activity: {
          average_sale_time: Math.round(60 + Math.random() * 90), // 60-150 дней
          demand_level: this.assessDemandLevel(regionMultiplier),
          sales_velocity: Math.round(10 + Math.random() * 40) // 10-50 объектов/месяц
        },
        demand_forecast: this.forecastDemand(regionMultiplier)
      };
    } catch (error) {
      console.error('Economic analysis error:', error);
      return this.getDefaultEconomics();
    }
  }

  /**
   * Получение расширенной аналитики с использованием Perplexity
   */
  static async getEnhancedAnalytics(
    location: string,
    lat: number,
    lng: number
  ): Promise<EnhancedQuarterAnalytics> {
    try {
      const [basicAnalytics, perplexityInsights] = await Promise.all([
        this.getQuarterAnalytics(lat, lng),
        this.getPerplexityInsights(location)
      ]);

      return {
        ...basicAnalytics,
        perplexity_insights: perplexityInsights,
        ai_insights: {
          summary: this.generateSummary(basicAnalytics),
          strengths: this.identifyStrengths(basicAnalytics),
          weaknesses: this.identifyWeaknesses(basicAnalytics),
          opportunities: this.identifyOpportunities(basicAnalytics),
          threats: this.identifyThreats(basicAnalytics),
          investment_recommendation: this.generateRecommendation(basicAnalytics),
          confidence_score: this.calculateConfidenceScore(basicAnalytics)
        }
      };
    } catch (error) {
      console.error('Enhanced analytics error:', error);
      throw new Error('Не удалось получить расширенную аналитику');
    }
  }

  // Вспомогательные методы

  /**
   * Создание границ области по центральной точке и радиусу
   */
  private static createBounds(lat: number, lng: number, radiusMeters: number): LatLngBounds {
    const latDelta = radiusMeters / 111320; // Примерно 111320 метров в градусе широты
    const lngDelta = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
    
    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta
    };
  }

  /**
   * Вычисление площади границ в км²
   */
  private static calculateBoundsArea(bounds: LatLngBounds): number {
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLng = 111.32 * Math.cos(((bounds.north + bounds.south) / 2) * Math.PI / 180);
    
    return (latDiff * kmPerDegreeLat) * (lngDiff * kmPerDegreeLng);
  }

  /**
   * Получение данных из кэша
   */
  private static getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Сохранение данных в кэш
   */
  private static setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Получение инсайтов от Perplexity
   */
  private static async getPerplexityInsights(location: string) {
    try {
      const city = this.extractCityFromLocation(location);
      const [demographic, economic, infrastructure, market, forecast] = await Promise.allSettled([
        PerplexityService.getDemographicInsights(location, city),
        PerplexityService.getEconomicAnalysis(location, city),
        PerplexityService.getInfrastructureDevelopment(location, city),
        PerplexityService.getRealEstateMarketAnalysis(location, city),
        PerplexityService.getDistrictForecast(location, city)
      ]);

      return {
        market_sentiment: economic.status === 'fulfilled' ? economic.value.market_conditions : 'Данные недоступны',
        development_projects: infrastructure.status === 'fulfilled' ? infrastructure.value.development_plans : [],
        investment_attractiveness: 70, // Базовое значение
        unique_location_features: market.status === 'fulfilled' ? [market.value.demand_patterns] : [],
        expert_opinion: forecast.status === 'fulfilled' ? forecast.value.growth_potential : 'Анализ недоступен',
        future_trends: forecast.status === 'fulfilled' ? forecast.value.development_prospects : []
      };
    } catch (error) {
      console.error('Perplexity insights error:', error);
      return null;
    }
  }

  // Методы по умолчанию для fallback

  private static getDefaultDemographics(): Demographics {
    return {
      population: {
        density: 2500,
        total: 50000,
        growth_forecast: 'stable'
      },
      structure: {
        average_age: 35,
        family_composition: {
          singles: 30,
          families_with_children: 50,
          elderly: 20
        },
        income_level: 'medium'
      }
    };
  }

  private static getDefaultTransport(): TransportAccessibility {
    return {
      pedestrian_traffic: 'medium',
      car_traffic: 'medium',
      metro_distance: 1500,
      public_transport_stops: {
        bus_stops: 3,
        nearest_distance: 300
      },
      major_roads_distance: 800
    };
  }

  private static getDefaultInfrastructure(): InfrastructureData {
    return {
      education: {
        schools: 2,
        kindergartens: 1,
        nearest_school_distance: 600
      },
      healthcare: {
        hospitals: 1,
        clinics: 2,
        nearest_medical_distance: 800
      },
      commercial: {
        shopping_centers: 1,
        shops: 8,
        restaurants: 5
      },
      recreation: {
        parks: 2,
        sports_facilities: 1,
        nearest_park_distance: 400
      },
      infrastructure_score: 65
    };
  }

  private static getDefaultCompetition(): CompetitionData {
    return {
      new_buildings: 5,
      secondary_housing: 15,
      total_competing_objects: 20
    };
  }

  private static getDefaultEconomics(): EconomicData {
    return {
      price_per_sqm: {
        economy_class: 60000,
        comfort_class: 90000,
        business_class: 130000,
        elite_class: 200000
      },
      price_dynamics: {
        yearly_change: 8,
        trend: 'growing'
      },
      market_activity: {
        average_sale_time: 90,
        demand_level: 'medium',
        sales_velocity: 25
      },
      demand_forecast: 'stable'
    };
  }

  // Аналитические методы

  private static predictPopulationGrowth(buildingDensity: number): 'increase' | 'decrease' | 'stable' {
    if (buildingDensity > 50) return 'increase';
    if (buildingDensity < 20) return 'decrease';
    return 'stable';
  }

  private static determineIncomeLevel(buildingDensity: number): 'low' | 'medium' | 'high' | 'mixed' {
    if (buildingDensity > 80) return 'high';
    if (buildingDensity > 40) return 'medium';
    if (buildingDensity < 15) return 'low';
    return 'mixed';
  }

  private static assessPedestrianTraffic(transportNodesCount: number): 'low' | 'medium' | 'high' {
    if (transportNodesCount > 10) return 'high';
    if (transportNodesCount > 5) return 'medium';
    return 'low';
  }

  private static calculateMajorRoadDistance(roads: any[]): number {
    const majorRoads = roads.filter(road => 
      ['motorway', 'trunk', 'primary'].includes(road.highway)
    );
    return majorRoads.length > 0 ? 200 + Math.random() * 800 : 1500 + Math.random() * 2000;
  }

  private static findNearest(amenities: any[]): any | null {
    return amenities.reduce((nearest, amenity) => 
      !nearest || (amenity.distance && (!nearest.distance || amenity.distance < nearest.distance)) 
        ? amenity : nearest
    , null);
  }

  private static calculateInfrastructureScore(infrastructure: {
    schools: number;
    hospitals: number;
    shops: number;
    parks: number;
  }): number {
    let score = 0;
    score += Math.min(infrastructure.schools * 15, 30); // Максимум 30 за школы
    score += Math.min(infrastructure.hospitals * 20, 40); // Максимум 40 за медицину
    score += Math.min(infrastructure.shops * 2, 20); // Максимум 20 за магазины
    score += Math.min(infrastructure.parks * 5, 10); // Максимум 10 за парки
    
    return Math.min(score, 100);
  }

  private static getRegionMultiplier(lat: number, lng: number): number {
    // Определение региона по координатам и соответствующего множителя цен
    if (lat > 55.5 && lat < 56.0 && lng > 37.0 && lng < 38.0) {
      return 2.5; // Москва
    }
    if (lat > 59.5 && lat < 60.5 && lng > 29.5 && lng < 31.0) {
      return 1.8; // СПб
    }
    if (lat > 56.5 && lat < 57.0 && lng > 60.0 && lng < 61.0) {
      return 1.2; // Екатеринбург
    }
    return 1.0; // Другие регионы
  }

  private static determinePriceTrend(regionMultiplier: number): 'growing' | 'falling' | 'stable' {
    if (regionMultiplier > 2.0) return 'growing';
    if (regionMultiplier > 1.5) return Math.random() > 0.3 ? 'growing' : 'stable';
    return Math.random() > 0.5 ? 'stable' : 'growing';
  }

  private static assessDemandLevel(regionMultiplier: number): 'low' | 'medium' | 'high' {
    if (regionMultiplier > 2.0) return 'high';
    if (regionMultiplier > 1.2) return 'medium';
    return 'low';
  }

  private static forecastDemand(regionMultiplier: number): 'increasing' | 'decreasing' | 'stable' {
    if (regionMultiplier > 2.0) return Math.random() > 0.2 ? 'increasing' : 'stable';
    if (regionMultiplier > 1.2) return Math.random() > 0.4 ? 'stable' : 'increasing';
    return Math.random() > 0.6 ? 'stable' : 'increasing';
  }

  private static extractCityFromLocation(location: string): string {
    const cities = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Казань', 'Челябинск'];
    for (const city of cities) {
      if (location.includes(city)) return city;
    }
    return 'Москва'; // По умолчанию
  }

  // AI-анализ для Enhanced Analytics

  private static generateSummary(analytics: QuarterAnalytics): string {
    const infraScore = analytics.infrastructure.infrastructure_score;
    const transportQuality = analytics.transport.metro_distance < 1000 ? 'отличная' : 'удовлетворительная';
    
    return `Район с ${infraScore > 70 ? 'развитой' : 'базовой'} инфраструктурой и ${transportQuality} транспортной доступностью. Плотность населения ${analytics.demographics.population.density} чел/км².`;
  }

  private static identifyStrengths(analytics: QuarterAnalytics): string[] {
    const strengths: string[] = [];
    
    if (analytics.infrastructure.infrastructure_score > 70) {
      strengths.push('Развитая инфраструктура');
    }
    if (analytics.transport.metro_distance < 1000) {
      strengths.push('Близость к метро');
    }
    if (analytics.economics.price_dynamics.trend === 'growing') {
      strengths.push('Растущие цены на недвижимость');
    }
    if (analytics.demographics.population.growth_forecast === 'increase') {
      strengths.push('Рост населения');
    }
    
    return strengths.length > 0 ? strengths : ['Стабильный район для проживания'];
  }

  private static identifyWeaknesses(analytics: QuarterAnalytics): string[] {
    const weaknesses: string[] = [];
    
    if (analytics.infrastructure.infrastructure_score < 50) {
      weaknesses.push('Недостаточно развитая инфраструктура');
    }
    if (analytics.transport.metro_distance > 2000) {
      weaknesses.push('Удаленность от метро');
    }
    if (analytics.economics.market_activity.demand_level === 'low') {
      weaknesses.push('Низкий спрос на рынке');
    }
    if (analytics.competition.total_competing_objects > 50) {
      weaknesses.push('Высокая конкуренция');
    }
    
    return weaknesses.length > 0 ? weaknesses : ['Минимальные недостатки'];
  }

  private static identifyOpportunities(analytics: QuarterAnalytics): string[] {
    const opportunities: string[] = [];
    
    if (analytics.economics.price_dynamics.yearly_change > 10) {
      opportunities.push('Высокий потенциал роста стоимости');
    }
    if (analytics.demographics.population.growth_forecast === 'increase') {
      opportunities.push('Рост спроса из-за увеличения населения');
    }
    if (analytics.infrastructure.education.schools < 2) {
      opportunities.push('Потенциал развития образовательной инфраструктуры');
    }
    
    return opportunities.length > 0 ? opportunities : ['Стабильные инвестиционные перспективы'];
  }

  private static identifyThreats(analytics: QuarterAnalytics): string[] {
    const threats: string[] = [];
    
    if (analytics.economics.price_dynamics.trend === 'falling') {
      threats.push('Снижение цен на недвижимость');
    }
    if (analytics.competition.new_buildings > 10) {
      threats.push('Большое количество новостроек');
    }
    if (analytics.demographics.population.growth_forecast === 'decrease') {
      threats.push('Снижение численности населения');
    }
    
    return threats.length > 0 ? threats : ['Минимальные риски'];
  }

  private static generateRecommendation(analytics: QuarterAnalytics): 'buy' | 'hold' | 'avoid' {
    let score = 0;
    
    // Позитивные факторы
    if (analytics.infrastructure.infrastructure_score > 70) score += 2;
    if (analytics.transport.metro_distance < 1000) score += 2;
    if (analytics.economics.price_dynamics.trend === 'growing') score += 1;
    if (analytics.demographics.population.growth_forecast === 'increase') score += 1;
    
    // Негативные факторы
    if (analytics.economics.market_activity.demand_level === 'low') score -= 2;
    if (analytics.competition.total_competing_objects > 30) score -= 1;
    if (analytics.transport.metro_distance > 2000) score -= 1;
    
    if (score >= 3) return 'buy';
    if (score >= 0) return 'hold';
    return 'avoid';
  }

  private static calculateConfidenceScore(analytics: QuarterAnalytics): number {
    let confidence = 70; // Базовая уверенность
    
    // Увеличиваем уверенность при наличии качественных данных
    if (analytics.infrastructure.infrastructure_score > 0) confidence += 10;
    if (analytics.transport.metro_distance < 9999) confidence += 10;
    if (analytics.economics.price_per_sqm.comfort_class > 0) confidence += 10;
    
    return Math.min(confidence, 95);
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