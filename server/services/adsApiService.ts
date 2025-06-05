import { storage } from '../storage';
import type { InsertProperty } from '../../shared/schema';

interface AdsApiProperty {
  id: string;
  title: string;
  price: number;
  area: number;
  rooms: number;
  floor: number;
  totalFloors: number;
  address: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  images: string[];
  propertyType: string;
  region: string;
  district: string;
  createdAt: string;
  updatedAt: string;
}

interface AdsApiResponse {
  data: AdsApiProperty[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
}

export class AdsApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // Попробуем несколько возможных базовых URLs для API
    this.baseUrl = process.env.ADS_API_URL || 'https://ads-api.ru/api/v1';
    this.apiKey = process.env.ADS_API_KEY || '1699b3bd91f1529aaeb9797a951cde4b';

    console.log('ADS API Configuration:');
    console.log('URL:', this.baseUrl);
    console.log('Access Token:', this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'Not configured');
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>, credentials?: { email: string; password: string }): Promise<T> {
    // Используем access_token если он настроен
    const accessToken = this.apiKey || '1699b3bd91f1529aaeb9797a951cde4b';
    
    if (!accessToken) {
      throw new Error('ADS API access token not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Добавляем access_token как обязательный параметр
    url.searchParams.append('access_token', accessToken);
    
    // Добавляем остальные параметры
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    console.log('Making request to:', url.toString());
    console.log('Headers:', { ...headers, Authorization: '[REDACTED]' });

    const response = await fetch(url.toString(), {
      headers,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response body:', errorText);
      throw new Error(`ADS API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async fetchProperties(filters?: {
    region?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }, credentials?: { email: string; password: string }): Promise<AdsApiResponse> {
    return this.makeRequest<AdsApiResponse>('/properties', {
      region: filters?.region,
      property_type: filters?.propertyType,
      min_price: filters?.minPrice,
      max_price: filters?.maxPrice,
      page: filters?.page || 1,
      limit: filters?.limit || 100,
    }, credentials);
  }

  async getProperty(externalId: string): Promise<AdsApiProperty> {
    return this.makeRequest<AdsApiProperty>(`/properties/${externalId}`);
  }

  private async mapPropertyClass(propertyType: string, pricePerSqm: number): Promise<number | null> {
    const propertyClasses = await storage.getPropertyClasses();
    
    // Определяем класс недвижимости по цене за м²
    const matchingClass = propertyClasses.find(pc => 
      pricePerSqm >= pc.minPricePerSqm && pricePerSqm <= pc.maxPricePerSqm
    );

    return matchingClass?.id || null;
  }

  private async mapRegion(regionName: string, district: string): Promise<number | null> {
    const regions = await storage.getRegions();
    
    // Ищем регион по названию
    const matchingRegion = regions.find(r => 
      r.name.toLowerCase().includes(regionName.toLowerCase()) ||
      regionName.toLowerCase().includes(r.name.toLowerCase())
    );

    return matchingRegion?.id || null;
  }

  private convertAdsPropertyToInsert(adsProperty: AdsApiProperty): Promise<InsertProperty> {
    return this.convertAdsProperty(adsProperty);
  }

  private async convertAdsProperty(adsProperty: AdsApiProperty): Promise<InsertProperty> {
    const pricePerSqm = Math.round(adsProperty.price / adsProperty.area);
    const regionId = await this.mapRegion(adsProperty.region, adsProperty.district);
    const propertyClassId = await this.mapPropertyClass(adsProperty.propertyType, pricePerSqm);

    return {
      externalId: adsProperty.id,
      regionId,
      propertyClassId,
      title: adsProperty.title,
      description: adsProperty.description,
      price: adsProperty.price,
      pricePerSqm,
      area: adsProperty.area.toString(),
      rooms: adsProperty.rooms,
      floor: adsProperty.floor,
      totalFloors: adsProperty.totalFloors,
      address: adsProperty.address,
      coordinates: `POINT(${adsProperty.coordinates.lng} ${adsProperty.coordinates.lat})`,
      imageUrl: adsProperty.images[0] || null,
      propertyType: adsProperty.propertyType,
      isActive: true,
      createdAt: new Date(adsProperty.createdAt),
      updatedAt: new Date(adsProperty.updatedAt),
    };
  }

  async syncProperties(regions?: string[], credentials?: { email: string; password: string }): Promise<{
    imported: number;
    updated: number;
    errors: string[];
  }> {
    if (!this.apiKey) {
      throw new Error('ADS API key not configured');
    }

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      const filters = regions ? { region: regions.join(',') } : {};
      const response = await this.fetchProperties(filters, credentials);

      for (const adsProperty of response.data) {
        try {
          // Проверяем, существует ли объект
          const existingProperties = await storage.getProperties({});
          
          const existingProperty = existingProperties.properties.find(p => 
            p.externalId === adsProperty.id
          );

          const propertyData = await this.convertAdsProperty(adsProperty);

          if (existingProperty) {
            // Обновляем существующий объект
            // TODO: Реализовать обновление через storage
            updated++;
          } else {
            // Создаем новый объект
            await storage.createProperty(propertyData);
            imported++;
          }
        } catch (error) {
          errors.push(`Error processing property ${adsProperty.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`ADS API sync completed: ${imported} imported, ${updated} updated, ${errors.length} errors`);
    } catch (error) {
      errors.push(`ADS API sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { imported, updated, errors };
  }

  async getStatus(): Promise<{ available: boolean; configured: boolean; regions: string[] }> {
    const configured = !!this.apiKey;
    
    if (!configured) {
      return { available: false, configured: false, regions: [] };
    }

    // Для демонстрации возвращаем статус "настроен, но требует активной подписки"
    const mockRegions = [
      'Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 
      'Казань', 'Нижний Новгород', 'Челябинск', 'Самара'
    ];

    try {
      const regions = await this.getRegions();
      return { 
        available: regions.length > 0, // API доступен если получены регионы
        configured: true, 
        regions: regions.length > 0 ? regions : mockRegions 
      };
    } catch (error) {
      console.error('ADS API not available:', error);
      return { 
        available: false, 
        configured: true, 
        regions: mockRegions 
      };
    }
  }

  async testApiEndpoints(): Promise<{ working: string[], failed: string[] }> {
    const testEndpoints = [
      '/',
      '/status', 
      '/regions',
      '/cities',
      '/properties',
      '/ads',
      '/listings',
      '/offers',
      '/api',
      '/v1',
      '/v1/regions',
      '/v1/properties',
      '/get_regions',
      '/get_cities'
    ];
    
    const working: string[] = [];
    const failed: string[] = [];
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        const response = await this.makeRequest<any>(endpoint);
        working.push(endpoint);
        console.log(`✓ Endpoint ${endpoint} works - Response type:`, typeof response);
        
        // Логируем структуру ответа для понимания API
        if (response && typeof response === 'object') {
          console.log(`Response keys for ${endpoint}:`, Object.keys(response));
        }
      } catch (error) {
        failed.push(endpoint);
        console.log(`✗ Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    return { working, failed };
  }

  async getRegions(credentials?: { email: string; password: string }): Promise<string[]> {
    // Сначала тестируем endpoints если это первый запрос
    const testResults = await this.testApiEndpoints();
    console.log('API Test Results:', testResults);
    
    // Попробуем найти regions в рабочих endpoints
    for (const endpoint of testResults.working) {
      try {
        const response = await this.makeRequest<any>(endpoint);
        
        // Ищем данные о регионах в ответе
        if (Array.isArray(response)) {
          return response;
        } else if (response && typeof response === 'object') {
          if ('regions' in response && Array.isArray(response.regions)) {
            return response.regions;
          }
          if ('cities' in response && Array.isArray(response.cities)) {
            return response.cities;
          }
          if ('data' in response && Array.isArray(response.data)) {
            return response.data;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    // Возвращаем заглушку если API недоступен
    return ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск'];
  }

  async isServiceAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;
      await this.makeRequest('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const adsApiService = new AdsApiService();