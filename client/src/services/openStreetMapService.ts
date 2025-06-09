/**
 * OpenStreetMap Service
 * Полноценный сервис карт на базе OpenStreetMap с геокодированием
 */

export interface MapOptions {
  container: HTMLElement;
  center: [number, number];
  zoom: number;
}

export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
  place_id: string;
  osm_type: string;
  osm_id: string;
  class: string;
  type: string;
  importance: number;
}

export interface ReverseGeocodingResult {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

// Новые интерфейсы для геоаналитики
export interface OSMAmenity {
  id: string;
  lat: number;
  lon: number;
  tags: {
    amenity?: string;
    name?: string;
    type?: string;
    [key: string]: any;
  };
  distance?: number;
}

export interface OSMTransportNode {
  id: string;
  lat: number;
  lon: number;
  tags: {
    public_transport?: string;
    railway?: string;
    highway?: string;
    name?: string;
    [key: string]: any;
  };
  distance?: number;
}

export interface OSMTrafficData {
  roads: Array<{
    id: string;
    highway: string;
    name?: string;
    maxspeed?: string;
    lanes?: string;
  }>;
  traffic_intensity: 'low' | 'medium' | 'high';
}

/**
 * Класс для работы с OpenStreetMap и геокодированием
 */
export class OpenStreetMapService {
  private static instance: OpenStreetMapService;
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private requestQueue: Promise<any>[] = [];
  private readonly maxConcurrentRequests = 3;
  private readonly requestDelay = 1000; // 1 секунда между запросами

  private constructor() {}

  public static getInstance(): OpenStreetMapService {
    if (!OpenStreetMapService.instance) {
      OpenStreetMapService.instance = new OpenStreetMapService();
    }
    return OpenStreetMapService.instance;
  }

  /**
   * Геокодирование - получение координат по адресу
   */
  async geocode(address: string, options?: {
    countrycodes?: string;
    limit?: number;
    bounded?: boolean;
    viewbox?: string;
  }): Promise<GeocodingResult[]> {
    return this.queueRequest(async () => {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: (options?.limit || 5).toString(),
        ...(options?.countrycodes && { countrycodes: options.countrycodes }),
        ...(options?.bounded && { bounded: '1' }),
        ...(options?.viewbox && { viewbox: options.viewbox })
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'User-Agent': 'SREDA Market Property Search/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }

      return response.json();
    });
  }

  /**
   * Обратное геокодирование - получение адреса по координатам
   */
  async reverseGeocode(lat: number, lon: number, options?: {
    zoom?: number;
    addressdetails?: boolean;
  }): Promise<ReverseGeocodingResult> {
    return this.queueRequest(async () => {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        zoom: (options?.zoom || 18).toString(),
        addressdetails: (options?.addressdetails !== false ? '1' : '0')
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          'User-Agent': 'SREDA Market Property Search/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.statusText}`);
      }

      return response.json();
    });
  }

  /**
   * Поиск адресов с автодополнением
   */
  async searchAddresses(query: string, options?: {
    countrycodes?: string;
    limit?: number;
    region?: string;
  }): Promise<GeocodingResult[]> {
    if (query.length < 3) {
      return [];
    }

    const russianQuery = options?.region === 'russia' ? `${query}, Россия` : query;
    
    return this.geocode(russianQuery, {
      countrycodes: options?.countrycodes || 'ru',
      limit: options?.limit || 10
    });
  }

  /**
   * Получение границ региона
   */
  async getRegionBounds(regionName: string): Promise<{
    bbox: [number, number, number, number];
    center: [number, number];
  } | null> {
    try {
      const results = await this.geocode(`${regionName}, Россия`, {
        countrycodes: 'ru',
        limit: 1
      });

      if (results.length === 0) {
        return null;
      }

      const result = results[0];
      const bbox = result.boundingbox.map(Number) as [number, number, number, number];
      const center: [number, number] = [
        parseFloat(result.lon),
        parseFloat(result.lat)
      ];

      return { bbox, center };
    } catch (error) {
      console.error('Error getting region bounds:', error);
      return null;
    }
  }

  /**
   * Валидация координат
   */
  validateCoordinates(lat: number, lon: number): boolean {
    return (
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180 &&
      !isNaN(lat) && !isNaN(lon)
    );
  }

  /**
   * Форматирование адреса
   */
  formatAddress(result: GeocodingResult | ReverseGeocodingResult): string {
    if ('address' in result && result.address) {
      const { house_number, road, suburb, city, state } = result.address;
      const parts = [
        house_number && road ? `${road}, ${house_number}` : road,
        suburb,
        city,
        state
      ].filter(Boolean);
      
      return parts.join(', ');
    }
    
    return result.display_name;
  }

  /**
   * Получение объектов инфраструктуры в радиусе
   */
  async getAmenities(lat: number, lng: number, radius: number, amenityType?: string): Promise<OSMAmenity[]> {
    return this.queueRequest(async () => {
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      
      const amenityFilter = amenityType ? `[amenity=${amenityType}]` : '[amenity]';
      const query = `
        [out:json][timeout:25];
        (
          node${amenityFilter}(around:${radius},${lat},${lng});
          way${amenityFilter}(around:${radius},${lat},${lng});
          relation${amenityFilter}(around:${radius},${lat},${lng});
        );
        out center meta;
      `;

      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'SREDA Market Analytics/1.0'
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.elements.map((element: any) => ({
        id: element.id.toString(),
        lat: element.lat || element.center?.lat || 0,
        lon: element.lon || element.center?.lon || 0,
        tags: element.tags || {},
        distance: this.calculateDistance(lat, lng, element.lat || element.center?.lat || 0, element.lon || element.center?.lon || 0)
      }));
    });
  }

  /**
   * Получение транспортных узлов в радиусе
   */
  async getTransportNodes(lat: number, lng: number, radius: number): Promise<OSMTransportNode[]> {
    return this.queueRequest(async () => {
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      
      const query = `
        [out:json][timeout:25];
        (
          node[public_transport](around:${radius},${lat},${lng});
          node[railway~"^(station|halt|tram_stop)$"](around:${radius},${lat},${lng});
          node[highway=bus_stop](around:${radius},${lat},${lng});
        );
        out meta;
      `;

      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'SREDA Market Analytics/1.0'
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.elements.map((element: any) => ({
        id: element.id.toString(),
        lat: element.lat,
        lon: element.lon,
        tags: element.tags || {},
        distance: this.calculateDistance(lat, lng, element.lat, element.lon)
      }));
    });
  }

  /**
   * Получение данных о дорожной сети
   */
  async getTrafficData(lat: number, lng: number): Promise<OSMTrafficData> {
    return this.queueRequest(async () => {
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      
      const query = `
        [out:json][timeout:25];
        (
          way[highway~"^(motorway|trunk|primary|secondary|tertiary)$"](around:1000,${lat},${lng});
        );
        out meta;
      `;

      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'SREDA Market Analytics/1.0'
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = await response.json();
      const roads = data.elements.map((element: any) => ({
        id: element.id.toString(),
        highway: element.tags?.highway || 'unknown',
        name: element.tags?.name || 'Безымянная дорога',
        maxspeed: element.tags?.maxspeed,
        lanes: element.tags?.lanes
      }));

      // Определяем интенсивность трафика по типам дорог
      const majorRoads = roads.filter(road => 
        ['motorway', 'trunk', 'primary'].includes(road.highway)
      ).length;
      
      let traffic_intensity: 'low' | 'medium' | 'high' = 'low';
      if (majorRoads >= 3) traffic_intensity = 'high';
      else if (majorRoads >= 1) traffic_intensity = 'medium';

      return { roads, traffic_intensity };
    });
  }

  /**
   * Получение данных о населении (приблизительно по плотности зданий)
   */
  async getPopulationData(bounds: { north: number; south: number; east: number; west: number }): Promise<{
    building_density: number;
    estimated_population: number;
  }> {
    return this.queueRequest(async () => {
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      
      const query = `
        [out:json][timeout:25];
        (
          way[building](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          relation[building](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        );
        out count;
      `;

      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'SREDA Market Analytics/1.0'
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = await response.json();
      const buildingCount = data.elements?.[0]?.tags?.total || 0;
      
      // Приблизительная оценка плотности населения
      const area = this.calculateBoundsArea(bounds);
      const building_density = buildingCount / area; // зданий на км²
      const estimated_population = buildingCount * 15; // примерно 15 человек на здание

      return { building_density, estimated_population };
    });
  }

  /**
   * Получение объектов недвижимости в области
   */
  async getRealEstateObjects(bounds: { north: number; south: number; east: number; west: number }): Promise<any[]> {
    return this.queueRequest(async () => {
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      
      const query = `
        [out:json][timeout:25];
        (
          way[building~"^(residential|apartments|house)$"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
          relation[building~"^(residential|apartments|house)$"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        );
        out center meta;
      `;

      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'SREDA Market Analytics/1.0'
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.elements.map((element: any) => ({
        id: element.id.toString(),
        lat: element.lat || element.center?.lat || 0,
        lon: element.lon || element.center?.lon || 0,
        tags: element.tags || {},
        building_type: element.tags?.building || 'residential'
      }));
    });
  }

  /**
   * Вычисление расстояния между двумя точками (в метрах)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // радиус Земли в метрах
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Вычисление площади области в км²
   */
  private calculateBoundsArea(bounds: { north: number; south: number; east: number; west: number }): number {
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    
    // Приблизительное вычисление площади
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLng = 111.32 * Math.cos(((bounds.north + bounds.south) / 2) * Math.PI / 180);
    
    return (latDiff * kmPerDegreeLat) * (lngDiff * kmPerDegreeLng);
  }

  /**
   * Управление очередью запросов для соблюдения лимитов API
   */
  private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    // Ограничиваем количество одновременных запросов
    while (this.requestQueue.length >= this.maxConcurrentRequests) {
      await Promise.race(this.requestQueue);
    }

    const requestPromise = this.executeWithDelay(request);
    this.requestQueue.push(requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      const index = this.requestQueue.indexOf(requestPromise);
      if (index > -1) {
        this.requestQueue.splice(index, 1);
      }
    }
  }

  /**
   * Выполнение запроса с задержкой
   */
  private async executeWithDelay<T>(request: () => Promise<T>): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    return request();
  }
}

// Экспорт экземпляра сервиса
export const openStreetMapService = OpenStreetMapService.getInstance();