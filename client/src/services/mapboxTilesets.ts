// Mapbox Tilesets service for cloud-hosted vector tiles
export interface MapboxTilesetConfig {
  tilesetId: string;
  accessToken: string;
  sourceLayer?: string;
}

export interface TilesetInfo {
  id: string;
  name: string;
  description: string;
  status: 'processing' | 'available' | 'error';
  created: string;
  modified: string;
  visibility: 'public' | 'private';
  size: number;
}

export class MapboxTilesetService {
  private config: MapboxTilesetConfig;

  constructor(config: MapboxTilesetConfig) {
    this.config = config;
  }

  /**
   * Получение информации о tileset
   */
  async getTilesetInfo(): Promise<TilesetInfo | null> {
    if (!this.config.accessToken) {
      throw new Error('Mapbox access token is required');
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/tilesets/v1/${this.config.tilesetId}?access_token=${this.config.accessToken}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Tileset не найден
        }
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        name: data.name || data.id,
        description: data.description || '',
        status: data.status || 'available',
        created: data.created,
        modified: data.modified,
        visibility: data.visibility || 'private',
        size: data.filesize || 0
      };

    } catch (error) {
      console.error('Error fetching tileset info:', error);
      throw error;
    }
  }

  /**
   * Проверка готовности tileset
   */
  async isTilesetReady(): Promise<boolean> {
    try {
      const info = await this.getTilesetInfo();
      return info?.status === 'available';
    } catch (error) {
      console.error('Error checking tileset status:', error);
      return false;
    }
  }

  /**
   * Добавление источника Mapbox tileset на карту
   */
  addTilesetSource(map: any, sourceId: string = 'mapbox-tileset'): void {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    map.addSource(sourceId, {
      type: 'vector',
      url: `mapbox://${this.config.tilesetId}`
    });
  }

  /**
   * Добавление слоев для Mapbox tileset
   */
  addTilesetLayers(map: any, sourceId: string = 'mapbox-tileset'): void {
    const sourceLayer = this.config.sourceLayer || 'properties';

    // Кластерные круги
    map.addLayer({
      id: 'mapbox-clusters',
      type: 'circle',
      source: sourceId,
      'source-layer': sourceLayer,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#51bbd6',
          100,
          '#f1f075',
          750,
          '#f28cb1'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          100,
          30,
          750,
          40
        ]
      }
    });

    // Числа в кластерах
    map.addLayer({
      id: 'mapbox-cluster-count',
      type: 'symbol',
      source: sourceId,
      'source-layer': sourceLayer,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Отдельные точки
    map.addLayer({
      id: 'mapbox-unclustered-point',
      type: 'circle',
      source: sourceId,
      'source-layer': sourceLayer,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'price'],
          0, '#ffffcc',
          5000000, '#feb24c',
          10000000, '#fd8d3c',
          20000000, '#f03b20',
          50000000, '#bd0026'
        ],
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          4, 3,
          12, 8,
          18, 15
        ],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.8
      }
    });
  }

  /**
   * Добавление тепловой карты для Mapbox tileset
   */
  addTilesetHeatmap(map: any, sourceId: string = 'mapbox-tileset', mode: 'density' | 'price' | 'investment' = 'density'): void {
    const sourceLayer = this.config.sourceLayer || 'properties';
    const weightExpression = this.getWeightExpression(mode);

    map.addLayer({
      id: 'mapbox-heatmap',
      type: 'heatmap',
      source: sourceId,
      'source-layer': sourceLayer,
      maxzoom: 15,
      paint: {
        'heatmap-weight': weightExpression,
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0.8
        ]
      }
    });
  }

  /**
   * Настройка обработчиков событий для Mapbox tileset
   */
  setupTilesetEventHandlers(map: any, onFeatureClick?: (feature: any) => void): void {
    // Клик по кластеру
    map.on('click', 'mapbox-clusters', (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['mapbox-clusters']
      });
      
      if (features.length > 0) {
        const clusterId = features[0].properties.cluster_id;
        map.getSource('mapbox-tileset').getClusterExpansionZoom(
          clusterId,
          (err: any, zoom: number) => {
            if (err) return;
            
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        );
      }
    });

    // Клик по отдельной точке
    if (onFeatureClick) {
      map.on('click', 'mapbox-unclustered-point', (e: any) => {
        if (e.features.length > 0) {
          onFeatureClick(e.features[0]);
        }
      });
    }

    // Изменение курсора
    ['mapbox-clusters', 'mapbox-unclustered-point'].forEach(layerId => {
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });
  }

  /**
   * Удаление всех слоев Mapbox tileset
   */
  removeTilesetLayers(map: any): void {
    const layerIds = [
      'mapbox-clusters',
      'mapbox-cluster-count', 
      'mapbox-unclustered-point',
      'mapbox-heatmap'
    ];
    
    layerIds.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
  }

  /**
   * Получение выражения для веса точек
   */
  private getWeightExpression(mode: 'density' | 'price' | 'investment'): any {
    switch (mode) {
      case 'price':
        return [
          'interpolate',
          ['linear'],
          ['get', 'price'],
          0, 0,
          50000000, 1
        ];
      case 'investment':
        return [
          'interpolate',
          ['linear'],
          ['get', 'investment_rating'],
          0, 0,
          10, 1
        ];
      case 'density':
      default:
        return 1;
    }
  }

  /**
   * Получение стиля для конкретного режима
   */
  getStyleUrl(styleId: string = 'streets-v11'): string {
    return `mapbox://styles/mapbox/${styleId}`;
  }

  /**
   * Обновление конфигурации tileset
   */
  updateConfig(newConfig: Partial<MapboxTilesetConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Фабрика для создания сервиса Mapbox Tileset
 */
export function createMapboxTilesetService(): MapboxTilesetService | null {
  const tilesetId = import.meta.env.VITE_MAPBOX_TILESET_ID;
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  if (!tilesetId || !accessToken) {
    console.warn('Mapbox tileset not configured. Set VITE_MAPBOX_TILESET_ID and VITE_MAPBOX_ACCESS_TOKEN');
    return null;
  }

  return new MapboxTilesetService({
    tilesetId,
    accessToken,
    sourceLayer: 'properties'
  });
}