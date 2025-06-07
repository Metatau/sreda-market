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
   * Создание градиентного пина от синего к фиолетовому
   */
  private createGradientPin(price: number, maxPrice: number): any {
    // Рассчитываем интенсивность градиента на основе цены
    const intensity = Math.min(price / maxPrice, 1);
    
    // Интерполяция от синего (#2563eb) к фиолетовому (#9333ea)
    const blueR = 37, blueG = 99, blueB = 235;
    const purpleR = 147, purpleG = 51, purpleB = 234;
    
    const r = Math.round(blueR + (purpleR - blueR) * intensity);
    const g = Math.round(blueG + (purpleG - blueG) * intensity);
    const b = Math.round(blueB + (purpleB - blueB) * intensity);
    
    const color = `rgb(${r}, ${g}, ${b})`;
    
    // Создаем SVG иконку с градиентным цветом
    const svgIcon = `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.8"/>
      </svg>
    `;
    
    return window.L.divIcon({
      html: svgIcon,
      className: 'gradient-pin',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }

  /**
   * Добавление маркеров недвижимости с градиентными пинами
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

    // Очищаем старые маркеры
    this.clearMarkers(mapId);

    // Находим максимальную цену для градиента
    const maxPrice = Math.max(...properties.map(p => p.price));

    properties.forEach(property => {
      const gradientIcon = this.createGradientPin(property.price, maxPrice);
      const marker = window.L.marker(
        [property.coordinates[1], property.coordinates[0]], 
        { icon: gradientIcon }
      );
      
      if (property.popup) {
        const formattedPrice = property.price.toLocaleString('ru-RU');
        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
              ${property.popup.title || 'Объект недвижимости'}
            </h3>
            <p style="margin: 4px 0; font-size: 14px; color: #374151;">
              <strong>Цена:</strong> ${formattedPrice} ₽
            </p>
            <p style="margin: 4px 0; font-size: 14px; color: #374151;">
              <strong>Адрес:</strong> ${property.popup.address || 'Не указан'}
            </p>
            ${property.popup.area ? `<p style="margin: 4px 0; font-size: 14px; color: #374151;">
              <strong>Площадь:</strong> ${property.popup.area}
            </p>` : ''}
            <button onclick="window.selectProperty && window.selectProperty(${property.id})" 
                    style="margin-top: 8px; padding: 6px 12px; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); 
                           color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
              Подробнее
            </button>
          </div>
        `);
      }

      if (options?.onMarkerClick) {
        marker.on('click', () => options.onMarkerClick!(property.popup));
        // Добавляем глобальную функцию для кнопки в попапе
        (window as any).selectProperty = (id: number) => {
          const selectedProperty = properties.find(p => p.id === id);
          if (selectedProperty && options?.onMarkerClick) {
            options.onMarkerClick(selectedProperty.popup);
          }
        };
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

    // Удаляем предыдущую тепловую карту
    this.removeHeatmap(mapId);

    // Простая реализация тепловой карты через круги с градиентом
    data.forEach((point, index) => {
      const circle = window.L.circle([point.lat, point.lng], {
        color: this.getHeatmapColor(point.intensity),
        fillColor: this.getHeatmapColor(point.intensity),
        fillOpacity: 0.4 + (point.intensity * 0.4), // Динамическая прозрачность
        radius: Math.max(50, (options?.radius || 100) * point.intensity), // Минимальный радиус 50м
        weight: 2,
        opacity: 0.8
      });

      circle.addTo(mapInstance.leafletMap);
      
      // Помечаем как тепловой слой
      (circle as any)._isHeatmapLayer = true;
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

    // Удаляем только тепловые слои
    const heatmapLayers = mapInstance.layers.filter((layer: any) => layer._isHeatmapLayer);
    heatmapLayers.forEach(layer => {
      mapInstance.leafletMap.removeLayer(layer);
    });
    
    // Обновляем массив слоев, исключая тепловые
    mapInstance.layers = mapInstance.layers.filter((layer: any) => !layer._isHeatmapLayer);

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

    // Удаляем предыдущее выделение
    if ((mapInstance as any).highlightLayer) {
      mapInstance.leafletMap.removeLayer((mapInstance as any).highlightLayer);
    }

    // Создаем анимированное выделение
    const highlightCircle = window.L.circle([coordinates.lat, coordinates.lng], {
      color: '#ff6b35',
      fillColor: '#ff6b35',
      fillOpacity: 0.3,
      radius: 150,
      weight: 3,
      opacity: 1
    });

    highlightCircle.addTo(mapInstance.leafletMap);
    (mapInstance as any).highlightLayer = highlightCircle;
    
    // Удаляем выделение через 4 секунды
    setTimeout(() => {
      if ((mapInstance as any).highlightLayer) {
        mapInstance.leafletMap.removeLayer((mapInstance as any).highlightLayer);
        delete (mapInstance as any).highlightLayer;
      }
    }, 4000);

    return true;
  }

  /**
   * Получение цвета для тепловой карты
   */
  private getHeatmapColor(intensity: number): string {
    // Градиент от зеленого (низкие цены) к красному (высокие цены)
    if (intensity > 0.9) return '#8B0000'; // Темно-красный
    if (intensity > 0.8) return '#FF0000'; // Красный
    if (intensity > 0.7) return '#FF4500'; // Оранжево-красный
    if (intensity > 0.6) return '#FF6347'; // Томатный
    if (intensity > 0.5) return '#FFA500'; // Оранжевый
    if (intensity > 0.4) return '#FFD700'; // Золотой
    if (intensity > 0.3) return '#FFFF00'; // Желтый
    if (intensity > 0.2) return '#9ACD32'; // Желто-зеленый
    if (intensity > 0.1) return '#32CD32'; // Лайм-зеленый
    return '#008000'; // Зеленый
  }
}

// Экспорт экземпляра сервиса
export const leafletMapService = LeafletMapService.getInstance();