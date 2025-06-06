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