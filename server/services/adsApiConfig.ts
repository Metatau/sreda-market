// Конфигурация для ads-api.ru
// Этот файл должен быть обновлен согласно официальной документации API

export interface AdsApiConfig {
  baseUrl: string;
  authMethod: 'bearer' | 'api_key' | 'basic' | 'query_param';
  endpoints: {
    regions: string;
    cities: string;
    properties: string;
    search: string;
    details: string;
  };
  authHeaders: Record<string, string>;
}

// Возможные конфигурации для тестирования
export const ADS_API_CONFIGS: AdsApiConfig[] = [
  {
    baseUrl: 'https://ads-api.ru/api/v1',
    authMethod: 'bearer',
    endpoints: {
      regions: '/regions',
      cities: '/cities', 
      properties: '/properties',
      search: '/search',
      details: '/property'
    },
    authHeaders: {}
  },
  {
    baseUrl: 'https://ads-api.ru/api',
    authMethod: 'api_key',
    endpoints: {
      regions: '/get_regions',
      cities: '/get_cities',
      properties: '/get_properties', 
      search: '/search_properties',
      details: '/get_property'
    },
    authHeaders: {}
  },
  {
    baseUrl: 'https://api.ads-api.ru',
    authMethod: 'bearer',
    endpoints: {
      regions: '/regions',
      cities: '/cities',
      properties: '/listings',
      search: '/search', 
      details: '/listing'
    },
    authHeaders: {}
  },
  {
    baseUrl: 'https://ads-api.ru',
    authMethod: 'query_param',
    endpoints: {
      regions: '/regions.json',
      cities: '/cities.json',
      properties: '/properties.json',
      search: '/search.json',
      details: '/property.json'
    },
    authHeaders: {}
  }
];

// Настройки по умолчанию - должны быть обновлены согласно документации
export const DEFAULT_CONFIG: AdsApiConfig = {
  baseUrl: process.env.ADS_API_URL || 'https://ads-api.ru/api',
  authMethod: 'bearer',
  endpoints: {
    regions: '/regions',
    cities: '/cities',
    properties: '/properties', 
    search: '/search',
    details: '/property'
  },
  authHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};