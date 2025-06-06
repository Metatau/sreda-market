// Hybrid data source management for map layers
export interface MapDataSourceConfig {
  preferVectorTiles: boolean;
  fallbackToGeoJSON: boolean;
  geoJsonEndpoint: string;
  updateInterval?: number;
}

export interface DataSourceStatus {
  vectorTiles: 'available' | 'unavailable' | 'checking';
  geoJson: 'available' | 'unavailable' | 'checking';
  activeSource: 'vector' | 'geojson' | 'none';
  lastUpdate?: Date;
}

export class MapDataSourceManager {
  private config: MapDataSourceConfig;
  private status: DataSourceStatus;
  private updateTimer?: NodeJS.Timeout;
  private map: any;

  constructor(config: MapDataSourceConfig) {
    this.config = config;
    this.status = {
      vectorTiles: 'checking',
      geoJson: 'checking',
      activeSource: 'none'
    };
  }

  /**
   * Инициализация источников данных на карте
   */
  async initializeDataSources(map: any): Promise<void> {
    try {
      this.map = map;

      // Проверяем доступность векторных тайлов
      if (this.config.preferVectorTiles) {
        await this.checkVectorTilesAvailability();
      }

      // Настраиваем GeoJSON источник
      await this.setupGeoJSONSource();

      // Выбираем оптимальный источник
      this.selectActiveSource();

      // Настраиваем автообновление для GeoJSON
      if (this.config.updateInterval && this.status.activeSource === 'geojson') {
        this.startAutoUpdate();
      }
    } catch (error) {
      console.warn('Data source initialization failed, using fallback mode');
      this.status.activeSource = 'none';
    }
  }

  /**
   * Проверка доступности векторных тайлов
   */
  private async checkVectorTilesAvailability(): Promise<void> {
    const tilesetId = import.meta.env.VITE_MAPBOX_TILESET_ID;
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    if (!tilesetId || !accessToken) {
      this.status.vectorTiles = 'unavailable';
      console.log('Vector tiles not configured, using API fallback');
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/tilesets/v1/${tilesetId}?access_token=${accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        this.status.vectorTiles = data.status === 'available' ? 'available' : 'unavailable';
      } else {
        this.status.vectorTiles = 'unavailable';
      }
    } catch (error) {
      console.warn('Vector tiles check failed:', error);
      this.status.vectorTiles = 'unavailable';
    }
  }

  /**
   * Настройка GeoJSON источника
   */
  private async setupGeoJSONSource(): Promise<void> {
    try {
      // Проверяем доступность API
      const response = await fetch(this.config.geoJsonEndpoint);
      if (response.ok) {
        this.status.geoJson = 'available';
      } else {
        this.status.geoJson = 'unavailable';
      }
    } catch (error) {
      console.warn('GeoJSON source check failed:', error);
      this.status.geoJson = 'unavailable';
    }
  }

  /**
   * Выбор активного источника данных
   */
  private selectActiveSource(): void {
    if (this.status.vectorTiles === 'available' && this.config.preferVectorTiles) {
      this.activateVectorTiles();
    } else if (this.status.geoJson === 'available') {
      this.activateGeoJSON();
    } else {
      this.status.activeSource = 'none';
      console.warn('No data sources available');
    }
  }

  /**
   * Активация векторных тайлов
   */
  private activateVectorTiles(): void {
    const tilesetId = import.meta.env.VITE_MAPBOX_TILESET_ID;

    if (this.map.getSource('properties')) {
      this.map.removeSource('properties');
    }

    this.map.addSource('properties', {
      type: 'vector',
      url: `mapbox://${tilesetId}`
    });

    this.status.activeSource = 'vector';
    console.log('Activated vector tiles source');
  }

  /**
   * Активация GeoJSON источника
   */
  private activateGeoJSON(): void {
    if (this.map.getSource('properties')) {
      this.map.removeSource('properties');
    }

    this.map.addSource('properties', {
      type: 'geojson',
      data: this.config.geoJsonEndpoint,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    this.status.activeSource = 'geojson';
    console.log('Activated GeoJSON source');
  }

  /**
   * Обновление GeoJSON данных
   */
  async updateGeoJSONData(): Promise<boolean> {
    if (this.status.activeSource !== 'geojson') {
      return false;
    }

    try {
      const source = this.map.getSource('properties');
      if (source && source.setData) {
        // Получаем свежие данные
        const response = await fetch(this.config.geoJsonEndpoint);
        const data = await response.json();
        
        source.setData(data);
        this.status.lastUpdate = new Date();
        return true;
      }
    } catch (error) {
      console.error('Failed to update GeoJSON data:', error);
    }

    return false;
  }

  /**
   * Запуск автообновления
   */
  private startAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.updateGeoJSONData();
    }, this.config.updateInterval);
  }

  /**
   * Остановка автообновления
   */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  /**
   * Переключение источника данных
   */
  async switchDataSource(sourceType: 'vector' | 'geojson'): Promise<boolean> {
    if (sourceType === 'vector' && this.status.vectorTiles === 'available') {
      this.stopAutoUpdate();
      this.activateVectorTiles();
      return true;
    } else if (sourceType === 'geojson' && this.status.geoJson === 'available') {
      this.activateGeoJSON();
      if (this.config.updateInterval) {
        this.startAutoUpdate();
      }
      return true;
    }

    return false;
  }

  /**
   * Получение статуса источников
   */
  getStatus(): DataSourceStatus {
    return { ...this.status };
  }

  /**
   * Получение конфигурации для слоев
   */
  getLayerConfig(): any {
    const baseConfig = {
      source: 'properties',
      layout: {},
      paint: {}
    };

    if (this.status.activeSource === 'vector') {
      return {
        ...baseConfig,
        'source-layer': 'properties'
      };
    }

    return baseConfig;
  }

  /**
   * Очистка ресурсов
   */
  cleanup(): void {
    this.stopAutoUpdate();
    
    if (this.map && this.map.getSource('properties')) {
      // Удаляем слои перед удалением источника
      const layers = this.map.getStyle().layers;
      const propertyLayers = layers.filter((layer: any) => 
        layer.source === 'properties'
      );
      
      propertyLayers.forEach((layer: any) => {
        if (this.map.getLayer(layer.id)) {
          this.map.removeLayer(layer.id);
        }
      });

      this.map.removeSource('properties');
    }
  }

  /**
   * Принудительная перезагрузка данных
   */
  async forceReload(): Promise<void> {
    // Переинициализируем проверки
    this.status.vectorTiles = 'checking';
    this.status.geoJson = 'checking';

    if (this.map) {
      await this.initializeDataSources(this.map);
    }
  }
}

/**
 * Фабрика для создания менеджера источников данных
 */
export function createMapDataSourceManager(config?: Partial<MapDataSourceConfig>): MapDataSourceManager {
  const defaultConfig: MapDataSourceConfig = {
    preferVectorTiles: true,
    fallbackToGeoJSON: true,
    geoJsonEndpoint: '/api/properties/geojson',
    updateInterval: 300000 // 5 минут
  };

  return new MapDataSourceManager({
    ...defaultConfig,
    ...config
  });
}