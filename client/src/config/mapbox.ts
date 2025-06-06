// Mapbox configuration and optimization settings
export interface MapboxConfig {
  accessToken: string;
  tilesetId?: string;
  defaultStyle: string;
  defaultCenter: [number, number];
  defaultZoom: number;
  maxBounds?: [[number, number], [number, number]];
  enableCDNOptimization: boolean;
  enableRTLTextPlugin: boolean;
}

export const mapboxConfig: MapboxConfig = {
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  tilesetId: import.meta.env.VITE_MAPBOX_TILESET_ID,
  defaultStyle: 'mapbox://styles/mapbox/light-v11',
  defaultCenter: [37.6176, 55.7558], // Москва
  defaultZoom: 6,
  maxBounds: [
    [19.48, 41.19], // Southwest coordinates (западная граница России)
    [169.01, 81.89] // Northeast coordinates (восточная граница России)
  ],
  enableCDNOptimization: true,
  enableRTLTextPlugin: false
};

/**
 * Создание оптимизированных опций для Mapbox GL JS
 */
export function createMapboxOptions(overrides: Partial<MapboxConfig> = {}): any {
  const config = { ...mapboxConfig, ...overrides };

  const options: any = {
    style: config.defaultStyle,
    center: config.defaultCenter,
    zoom: config.defaultZoom,
    attributionControl: true,
    logoPosition: 'bottom-left',
    // Ограничение области просмотра Россией
    maxBounds: config.maxBounds
  };

  // Оптимизация загрузки через CDN
  if (config.enableCDNOptimization) {
    options.transformRequest = (url: string, resourceType: string) => {
      if (resourceType === 'Tile' && url.startsWith('https://api.mapbox.com')) {
        return {
          url: url.replace('api.mapbox.com', 'cdn.mapbox.com')
        };
      }
      
      // Оптимизация для других ресурсов
      if (resourceType === 'Style' && url.startsWith('https://api.mapbox.com')) {
        return {
          url: url.replace('api.mapbox.com', 'cdn.mapbox.com')
        };
      }

      return { url };
    };
  }

  return options;
}

/**
 * Инициализация Mapbox GL JS с оптимизациями
 */
export function initializeMapbox(config: Partial<MapboxConfig> = {}): void {
  const finalConfig = { ...mapboxConfig, ...config };

  if (!finalConfig.accessToken) {
    console.warn('Mapbox access token not provided');
    return;
  }

  if (!window.mapboxgl) {
    console.error('Mapbox GL JS not loaded');
    return;
  }

  // Установка токена
  window.mapboxgl.accessToken = finalConfig.accessToken;

  // Настройка RTL текста для арабского и других языков (если нужно)
  if (finalConfig.enableRTLTextPlugin) {
    window.mapboxgl.setRTLTextPlugin(
      'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
      null,
      true // lazy: load when needed
    );
  }

  console.log('Mapbox initialized with optimizations');
}

/**
 * Проверка доступности Mapbox сервисов
 */
export async function checkMapboxStatus(): Promise<{
  apiAvailable: boolean;
  tilesetAvailable: boolean;
  geocodingAvailable: boolean;
}> {
  const config = mapboxConfig;
  const status = {
    apiAvailable: false,
    tilesetAvailable: false,
    geocodingAvailable: false
  };

  if (!config.accessToken) {
    return status;
  }

  try {
    // Проверка основного API
    const apiResponse = await fetch(
      `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${config.accessToken}`
    );
    status.apiAvailable = apiResponse.ok;

    // Проверка tileset если настроен
    if (config.tilesetId) {
      const tilesetResponse = await fetch(
        `https://api.mapbox.com/tilesets/v1/${config.tilesetId}?access_token=${config.accessToken}`
      );
      status.tilesetAvailable = tilesetResponse.ok;
    }

    // Проверка геокодирования
    const geocodingResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/moscow.json?access_token=${config.accessToken}&limit=1`
    );
    status.geocodingAvailable = geocodingResponse.ok;

  } catch (error) {
    console.warn('Mapbox status check failed:', error);
  }

  return status;
}

/**
 * Стили карты для России
 */
export const russianMapStyles = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12'
};

/**
 * Центральные точки крупных городов России
 */
export const russianCities = {
  moscow: [37.6176, 55.7558],
  spb: [30.3609, 59.9311],
  novosibirsk: [82.9346, 55.0084],
  ekaterinburg: [60.6122, 56.8431],
  kazan: [49.1221, 55.7887],
  nizhniyNovgorod: [44.0020, 56.2965],
  chelyabinsk: [61.4291, 55.1540],
  samara: [50.1213, 53.1956],
  omsk: [73.3686, 54.9893],
  rostovOnDon: [39.7015, 47.2357]
} as const;