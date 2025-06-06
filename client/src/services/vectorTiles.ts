// Vector tiles service for efficient property data loading
export interface VectorTileConfig {
  tilesUrl: string;
  sourceLayer: string;
  maxZoom: number;
  minZoom: number;
}

export interface PropertyTileData {
  id: number;
  title: string;
  price: number;
  pricePerSqm?: number;
  rooms: number;
  totalArea: string;
  coordinates: [number, number];
  propertyClass?: string;
  region?: string;
}

export class VectorTileService {
  private config: VectorTileConfig;

  constructor(config?: Partial<VectorTileConfig>) {
    this.config = {
      tilesUrl: '/tiles/properties/{z}/{x}/{y}.pbf',
      sourceLayer: 'properties',
      maxZoom: 18,
      minZoom: 4,
      ...config
    };
  }

  /**
   * Добавление источника векторных тайлов на карту
   */
  addVectorSource(map: any, sourceId: string = 'properties-tiles'): void {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    map.addSource(sourceId, {
      type: 'vector',
      tiles: [this.config.tilesUrl],
      maxzoom: this.config.maxZoom,
      minzoom: this.config.minZoom
    });
  }

  /**
   * Добавление слоя кластеров из векторных тайлов
   */
  addClusterLayer(map: any, sourceId: string = 'properties-tiles'): void {
    // Кластерные круги
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: sourceId,
      'source-layer': this.config.sourceLayer,
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
      id: 'cluster-count',
      type: 'symbol',
      source: sourceId,
      'source-layer': this.config.sourceLayer,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12
      }
    });

    // Отдельные точки
    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: sourceId,
      'source-layer': this.config.sourceLayer,
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
   * Добавление тепловой карты из векторных тайлов
   */
  addHeatmapLayer(map: any, sourceId: string = 'properties-tiles', mode: 'density' | 'price' | 'investment' = 'density'): void {
    const weightExpression = this.getWeightExpression(mode);

    map.addLayer({
      id: 'heatmap',
      type: 'heatmap',
      source: sourceId,
      'source-layer': this.config.sourceLayer,
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

    // Добавляем круги для высоких масштабов
    map.addLayer({
      id: 'heatmap-point',
      type: 'circle',
      source: sourceId,
      'source-layer': this.config.sourceLayer,
      minzoom: 14,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, ['interpolate', ['linear'], weightExpression, 1, 1, 6, 4],
          16, ['interpolate', ['linear'], weightExpression, 1, 5, 6, 50]
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          weightExpression,
          1, 'rgba(33,102,172,0.8)',
          2, 'rgba(103,169,207,0.8)',
          3, 'rgba(209,229,240,0.8)',
          4, 'rgba(253,219,199,0.8)',
          5, 'rgba(239,138,98,0.8)',
          6, 'rgba(178,24,43,0.8)'
        ],
        'circle-stroke-color': 'white',
        'circle-stroke-width': 1,
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0,
          15, 1
        ]
      }
    });
  }

  /**
   * Получение выражения для веса точек в зависимости от режима
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
   * Удаление всех слоев векторных тайлов
   */
  removeAllLayers(map: any): void {
    const layerIds = ['clusters', 'cluster-count', 'unclustered-point', 'heatmap', 'heatmap-point'];
    
    layerIds.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
  }

  /**
   * Обновление URL тайлов
   */
  updateTilesUrl(newUrl: string): void {
    this.config.tilesUrl = newUrl;
  }

  /**
   * Получение информации о feature при клике
   */
  queryFeatures(map: any, point: any): any[] {
    return map.queryRenderedFeatures(point, {
      layers: ['unclustered-point']
    });
  }

  /**
   * Настройка обработчиков событий для векторных тайлов
   */
  setupEventHandlers(map: any, onFeatureClick?: (feature: any) => void): void {
    // Клик по кластеру
    map.on('click', 'clusters', (e: any) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      const clusterId = features[0].properties.cluster_id;
      
      map.getSource('properties-tiles').getClusterExpansionZoom(
        clusterId,
        (err: any, zoom: number) => {
          if (err) return;
          
          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        }
      );
    });

    // Клик по отдельной точке
    if (onFeatureClick) {
      map.on('click', 'unclustered-point', (e: any) => {
        onFeatureClick(e.features[0]);
      });
    }

    // Изменение курсора
    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('mouseenter', 'unclustered-point', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
    });
  }
}

// Экспорт синглтона
export const vectorTileService = new VectorTileService();