// Утилиты для работы с картой
import mapboxgl from 'mapbox-gl';

/**
 * Создание базового стиля карты без Mapbox токена
 */
export const createBasicMapStyle = (): any => ({
  version: 8 as const,
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f8f9fa'
      }
    },
    {
      id: 'base-tiles',
      type: 'raster',
      source: 'raster-tiles',
      paint: {
        'raster-opacity': 1
      }
    }
  ]
});

/**
 * Безопасная инициализация Mapbox
 */
export const safeMapboxInit = (
  container: HTMLElement,
  options: {
    center: [number, number];
    zoom: number;
    accessToken?: string;
  }
): mapboxgl.Map => {
  const { center, zoom, accessToken } = options;
  
  // Если токен есть, используем кастомный стиль SREDA Market
  if (accessToken) {
    mapboxgl.accessToken = accessToken;
    return new mapboxgl.Map({
      container,
      style: 'mapbox://styles/metatau/cmbkg51ya00op01s57nc41f8q',
      center,
      zoom,
      preserveDrawingBuffer: true
    });
  }
  
  // Иначе используем базовый стиль с OpenStreetMap
  return new mapboxgl.Map({
    container,
    style: createBasicMapStyle(),
    center,
    zoom,
    preserveDrawingBuffer: true
  });
};

/**
 * Проверка доступности Mapbox токена
 */
export const isMapboxTokenAvailable = (): boolean => {
  return !!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
};

/**
 * Получение конфигурации карты
 */
export const getMapConfig = () => ({
  accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
  tilesetId: import.meta.env.VITE_MAPBOX_TILESET_ID,
  hasMapboxAccess: isMapboxTokenAvailable()
});