// Geocoding service for address search and coordinates conversion
export interface GeocodingConfig {
  accessToken: string;
  country: string;
  language: string;
  types: string[];
  proximity: [number, number];
  bbox: [number, number, number, number];
}

export interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
  relevance: number;
  properties: Record<string, any>;
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

export interface GeocodingResponse {
  type: string;
  query: string[];
  features: GeocodingResult[];
  attribution: string;
}

export const geocodingConfig: GeocodingConfig = {
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  country: 'ru',
  language: 'ru',
  types: ['place', 'address', 'poi'],
  proximity: [37.6176, 55.7558], // Москва как центр
  bbox: [19.48, 41.19, 169.01, 81.89] // Границы России
};

export class GeocodingService {
  private config: GeocodingConfig;

  constructor(config: GeocodingConfig = geocodingConfig) {
    this.config = config;
  }

  /**
   * Forward geocoding: поиск координат по адресу
   */
  async searchAddress(query: string, options?: {
    proximity?: [number, number];
    bbox?: [number, number, number, number];
    types?: string[];
    limit?: number;
  }): Promise<GeocodingResult[]> {
    if (!this.config.accessToken) {
      throw new Error('Mapbox access token is required for geocoding');
    }

    const params = new URLSearchParams({
      access_token: this.config.accessToken,
      country: this.config.country,
      language: this.config.language,
      types: (options?.types || this.config.types).join(','),
      limit: String(options?.limit || 5)
    });

    if (options?.proximity || this.config.proximity) {
      const proximity = options?.proximity || this.config.proximity;
      params.append('proximity', `${proximity[0]},${proximity[1]}`);
    }

    if (options?.bbox || this.config.bbox) {
      const bbox = options?.bbox || this.config.bbox;
      params.append('bbox', bbox.join(','));
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data: GeocodingResponse = await response.json();
      return data.features;
    } catch (error) {
      console.error('Geocoding search error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocoding: поиск адреса по координатам
   */
  async reverseGeocode(longitude: number, latitude: number, options?: {
    types?: string[];
    limit?: number;
  }): Promise<GeocodingResult[]> {
    if (!this.config.accessToken) {
      throw new Error('Mapbox access token is required for geocoding');
    }

    const params = new URLSearchParams({
      access_token: this.config.accessToken,
      country: this.config.country,
      language: this.config.language,
      limit: String(options?.limit || 1)
    });

    if (options?.types) {
      params.append('types', options.types.join(','));
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      const data: GeocodingResponse = await response.json();
      return data.features;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  /**
   * Получение предложений для автодополнения
   */
  async getSuggestions(query: string, options?: {
    proximity?: [number, number];
    types?: string[];
    limit?: number;
  }): Promise<GeocodingResult[]> {
    if (query.length < 3) {
      return [];
    }

    return this.searchAddress(query, {
      ...options,
      limit: options?.limit || 5
    });
  }

  /**
   * Форматирование адреса для отображения
   */
  formatAddress(result: GeocodingResult): string {
    return result.place_name;
  }

  /**
   * Получение типа места на русском языке
   */
  getPlaceTypeRu(placeType: string[]): string {
    const typeMap: Record<string, string> = {
      'country': 'Страна',
      'region': 'Регион',
      'postcode': 'Почтовый индекс',
      'district': 'Район',
      'place': 'Населенный пункт',
      'locality': 'Местность',
      'neighborhood': 'Микрорайон',
      'address': 'Адрес',
      'poi': 'Объект',
      'poi.landmark': 'Достопримечательность'
    };

    const type = placeType[0] || 'unknown';
    return typeMap[type] || 'Место';
  }
}

// Экспорт синглтона сервиса
export const geocodingService = new GeocodingService();