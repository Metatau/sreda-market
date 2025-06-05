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
    this.baseUrl = process.env.ADS_API_URL || 'https://api.ads-api.ru/v1';
    this.apiKey = process.env.ADS_API_KEY || '';

    if (!this.apiKey) {
      console.warn('ADS_API_KEY not configured. Property synchronization will be disabled.');
    }
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>, credentials?: { email: string; password: string }): Promise<T> {
    if (!this.apiKey) {
      throw new Error('ADS API key not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
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

    // Используем Basic Auth если переданы учетные данные, иначе Bearer токен
    if (credentials) {
      const auth = Buffer.from(`${credentials.email}:${credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url.toString(), {
      headers,
    });

    if (!response.ok) {
      throw new Error(`ADS API error: ${response.status} ${response.statusText}`);
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
  }): Promise<AdsApiResponse> {
    return this.makeRequest<AdsApiResponse>('/properties', {
      region: filters?.region,
      property_type: filters?.propertyType,
      min_price: filters?.minPrice,
      max_price: filters?.maxPrice,
      page: filters?.page || 1,
      limit: filters?.limit || 100,
    });
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
      const response = await this.fetchProperties(filters);

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

    try {
      const regions = await this.getRegions();
      return { available: true, configured: true, regions };
    } catch (error) {
      console.error('ADS API not available:', error);
      return { available: false, configured: true, regions: [] };
    }
  }

  async getRegions(): Promise<string[]> {
    try {
      const response = await this.makeRequest<{ regions: string[] }>('/regions');
      return response.regions;
    } catch (error) {
      console.error('Error fetching regions from ADS API:', error);
      return [];
    }
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