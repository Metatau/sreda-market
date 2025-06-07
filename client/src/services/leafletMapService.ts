/**
 * Leaflet Map Service
 * Сервис для создания и управления картами на базе Leaflet + OpenStreetMap
 */

// Типы для Leaflet (базовые)
declare global {
  interface Window {
    L: any;
  }
}

export interface MapInstance {
  id: string;
  leafletMap: any;
  container: HTMLElement;
  markers: any[];
  layers: any[];
}

export interface MarkerOptions {
  title?: string;
  popup?: string;
  icon?: any;
  draggable?: boolean;
  clickable?: boolean;
}

export interface LayerOptions {
  style?: {
    color?: string;
    weight?: number;
    opacity?: number;
    fillColor?: string;
    fillOpacity?: number;
  };
}

/**
 * Класс для работы с Leaflet картами
 */
export class LeafletMapService {
  private static instance: LeafletMapService;
  private maps: Map<string, MapInstance> = new Map();
  private leafletLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): LeafletMapService {
    if (!LeafletMapService.instance) {
      LeafletMapService.instance = new LeafletMapService();
    }
    return LeafletMapService.instance;
  }

  /**
   * Загрузка Leaflet библиотеки
   */
  async loadLeaflet(): Promise<void> {
    if (this.leafletLoaded) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.loadLeafletResources();
    await this.loadingPromise;
  }

  private async loadLeafletResources(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Загружаем CSS
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      cssLink.crossOrigin = '';
      document.head.appendChild(cssLink);

      // Загружаем JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      
      script.onload = () => {
        this.leafletLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Leaflet'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Создание новой карты
   */
  async createMap(
    container: HTMLElement,
    options: {
      center: [number, number];
      zoom: number;
      maxZoom?: number;
      minZoom?: number;
    }
  ): Promise<string> {
    await this.loadLeaflet();

    const mapId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Создаем карту Leaflet
    const leafletMap = window.L.map(container, {
      center: [options.center[1], options.center[0]], // Leaflet использует [lat, lng]
      zoom: options.zoom,
      maxZoom: options.maxZoom || 18,
      minZoom: options.minZoom || 1
    });

    // Добавляем слой OpenStreetMap
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(leafletMap);

    const mapInstance: MapInstance = {
      id: mapId,
      leafletMap,
      container,
      markers: [],
      layers: []
    };

    this.maps.set(mapId, mapInstance);
    return mapId;
  }

  /**
   * Получение экземпляра карты
   */
  getMap(mapId: string): MapInstance | null {
    return this.maps.get(mapId) || null;
  }

  /**
   * Добавление маркера на карту
   */
  addMarker(
    mapId: string,
    coordinates: [number, number],
    options?: MarkerOptions
  ): string | null {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return null;
    }

    const marker = window.L.marker([coordinates[1], coordinates[0]], {
      title: options?.title,
      draggable: options?.draggable || false,
      ...(options?.icon && { icon: options.icon })
    });

    if (options?.popup) {
      marker.bindPopup(options.popup);
    }

    marker.addTo(mapInstance.leafletMap);
    mapInstance.markers.push(marker);

    return `marker_${mapInstance.markers.length - 1}`;
  }

  /**
   * Добавление слоя GeoJSON
   */
  addGeoJsonLayer(
    mapId: string,
    geoJsonData: any,
    options?: LayerOptions
  ): string | null {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return null;
    }

    const layer = window.L.geoJSON(geoJsonData, {
      style: options?.style || {
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.2
      },
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties && feature.properties.title) {
          layer.bindPopup(feature.properties.title);
        }
      }
    });

    layer.addTo(mapInstance.leafletMap);
    mapInstance.layers.push(layer);

    return `layer_${mapInstance.layers.length - 1}`;
  }

  /**
   * Установка вида карты
   */
  setView(mapId: string, center: [number, number], zoom: number): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    mapInstance.leafletMap.setView([center[0], center[1]], zoom);
    return true;
  }

  /**
   * Подгонка карты под маркеры
   */
  fitToMarkers(mapId: string, padding?: number): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance || mapInstance.markers.length === 0) {
      return false;
    }

    const group = new window.L.featureGroup(mapInstance.markers);
    mapInstance.leafletMap.fitBounds(group.getBounds(), {
      padding: [padding || 20, padding || 20]
    });

    return true;
  }

  /**
   * Очистка всех маркеров
   */
  clearMarkers(mapId: string): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    mapInstance.markers.forEach(marker => {
      mapInstance.leafletMap.removeLayer(marker);
    });

    mapInstance.markers = [];
    return true;
  }

  /**
   * Очистка всех слоев
   */
  clearLayers(mapId: string): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    mapInstance.layers.forEach(layer => {
      mapInstance.leafletMap.removeLayer(layer);
    });

    mapInstance.layers = [];
    return true;
  }

  /**
   * Добавление обработчика события
   */
  addEventListener(
    mapId: string,
    event: string,
    callback: (e: any) => void
  ): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    mapInstance.leafletMap.on(event, callback);
    return true;
  }

  /**
   * Удаление карты
   */
  destroyMap(mapId: string): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    mapInstance.leafletMap.remove();
    this.maps.delete(mapId);
    return true;
  }

  /**
   * Получение текущего центра карты
   */
  getCenter(mapId: string): [number, number] | null {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return null;
    }

    const center = mapInstance.leafletMap.getCenter();
    return [center.lng, center.lat];
  }

  /**
   * Получение текущего зума карты
   */
  getZoom(mapId: string): number | null {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return null;
    }

    return mapInstance.leafletMap.getZoom();
  }

  /**
   * Добавление маркеров недвижимости
   */
  addPropertyMarkers(
    mapId: string, 
    properties: Array<{
      id: number;
      coordinates: [number, number];
      popup: any;
      className: string;
      price: number;
    }>,
    options?: {
      onMarkerClick?: (property: any) => void;
      getMarkerColor?: (className: string) => string;
    }
  ): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    properties.forEach(property => {
      const marker = window.L.marker([property.coordinates[1], property.coordinates[0]]);
      
      if (property.popup) {
        marker.bindPopup(`
          <div>
            <h3>${property.popup.title || 'Property'}</h3>
            <p>Price: ${property.price.toLocaleString()} ₽</p>
            <p>Class: ${property.className}</p>
          </div>
        `);
      }

      if (options?.onMarkerClick) {
        marker.on('click', () => options.onMarkerClick!(property.popup));
      }

      marker.addTo(mapInstance.leafletMap);
      mapInstance.markers.push(marker);
    });

    return true;
  }

  /**
   * Добавление тепловой карты
   */
  addHeatmap(
    mapId: string,
    data: Array<{ lat: number; lng: number; intensity: number }>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
    }
  ): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    // Простая реализация тепловой карты через круги
    data.forEach(point => {
      const circle = window.L.circle([point.lat, point.lng], {
        color: this.getHeatmapColor(point.intensity),
        fillColor: this.getHeatmapColor(point.intensity),
        fillOpacity: 0.3,
        radius: (options?.radius || 25) * point.intensity
      });

      circle.addTo(mapInstance.leafletMap);
      mapInstance.layers.push(circle);
    });

    return true;
  }

  /**
   * Удаление тепловой карты
   */
  removeHeatmap(mapId: string): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    // Удаляем все слои (включая тепловую карту)
    mapInstance.layers.forEach(layer => {
      mapInstance.leafletMap.removeLayer(layer);
    });
    mapInstance.layers = [];

    return true;
  }

  /**
   * Выделение маркера
   */
  highlightMarker(
    mapId: string,
    propertyId: number,
    coordinates: { lat: number; lng: number }
  ): boolean {
    const mapInstance = this.maps.get(mapId);
    if (!mapInstance) {
      return false;
    }

    // Создаем выделяющий круг
    const highlightCircle = window.L.circle([coordinates.lat, coordinates.lng], {
      color: 'red',
      fillColor: 'red',
      fillOpacity: 0.2,
      radius: 100
    });

    highlightCircle.addTo(mapInstance.leafletMap);
    
    // Удаляем выделение через 3 секунды
    setTimeout(() => {
      mapInstance.leafletMap.removeLayer(highlightCircle);
    }, 3000);

    return true;
  }

  /**
   * Получение цвета для тепловой карты
   */
  private getHeatmapColor(intensity: number): string {
    if (intensity > 0.8) return '#FF0000';
    if (intensity > 0.6) return '#FF4500';
    if (intensity > 0.4) return '#FFA500';
    if (intensity > 0.2) return '#FFFF00';
    return '#00FF00';
  }
}

// Экспорт экземпляра сервиса
export const leafletMapService = LeafletMapService.getInstance();