// Утилиты для оптимизации производительности карты
export interface MapPerformanceMetrics {
  loadTime: number;
  tileLoadTime: number;
  renderTime: number;
  memoryUsage?: number;
  visibleTiles: number;
}

export class MapPerformanceMonitor {
  private startTime: number = 0;
  private metrics: Partial<MapPerformanceMetrics> = {};
  private map: any = null;

  constructor(map: any) {
    this.map = map;
    this.startTime = performance.now();
    this.setupMonitoring();
  }

  private setupMonitoring(): void {
    if (!this.map) return;

    // Мониторинг загрузки карты
    this.map.on('load', () => {
      this.metrics.loadTime = performance.now() - this.startTime;
      console.log(`Map loaded in ${this.metrics.loadTime.toFixed(2)}ms`);
    });

    // Мониторинг загрузки тайлов
    const tileStartTime = performance.now();
    this.map.on('data', (e: any) => {
      if (e.dataType === 'source' && e.isSourceLoaded) {
        this.metrics.tileLoadTime = performance.now() - tileStartTime;
      }
    });

    // Мониторинг рендеринга
    this.map.on('render', () => {
      this.metrics.renderTime = performance.now() - this.startTime;
    });

    // Мониторинг использования памяти (если доступно)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }, 5000);
    }
  }

  /**
   * Получение текущих метрик производительности
   */
  getMetrics(): MapPerformanceMetrics {
    const visibleTiles = this.getVisibleTilesCount();
    
    return {
      loadTime: this.metrics.loadTime || 0,
      tileLoadTime: this.metrics.tileLoadTime || 0,
      renderTime: this.metrics.renderTime || 0,
      memoryUsage: this.metrics.memoryUsage,
      visibleTiles
    };
  }

  /**
   * Подсчет видимых тайлов
   */
  private getVisibleTilesCount(): number {
    if (!this.map) return 0;
    
    try {
      const sources = this.map.getStyle().sources;
      let tileCount = 0;
      
      Object.values(sources).forEach((source: any) => {
        if (source.type === 'vector' || source.type === 'raster') {
          // Приблизительный подсчет на основе области просмотра
          const bounds = this.map.getBounds();
          const zoom = this.map.getZoom();
          
          // Упрощенная формула для подсчета тайлов
          const tilesPerSide = Math.pow(2, Math.floor(zoom));
          tileCount += tilesPerSide * tilesPerSide;
        }
      });
      
      return tileCount;
    } catch (error) {
      console.warn('Failed to count visible tiles:', error);
      return 0;
    }
  }

  /**
   * Оптимизация производительности на основе метрик
   */
  optimizePerformance(): void {
    const metrics = this.getMetrics();
    
    // Если карта загружается медленно
    if (metrics.loadTime > 3000) {
      console.warn('Slow map loading detected. Consider optimizing data sources.');
      this.reduceTileQuality();
    }

    // Если используется много памяти
    if (metrics.memoryUsage && metrics.memoryUsage > 100) {
      console.warn('High memory usage detected. Cleaning up resources.');
      this.cleanupResources();
    }

    // Если много видимых тайлов
    if (metrics.visibleTiles > 100) {
      console.log('High tile count. Enabling tile culling.');
      this.enableTileCulling();
    }
  }

  /**
   * Снижение качества тайлов для ускорения загрузки
   */
  private reduceTileQuality(): void {
    if (!this.map) return;

    // Снижаем максимальный зум для тайлов
    const sources = this.map.getStyle().sources;
    Object.keys(sources).forEach(sourceId => {
      const source = sources[sourceId];
      if (source.type === 'vector') {
        try {
          this.map.removeSource(sourceId);
          this.map.addSource(sourceId, {
            ...source,
            maxzoom: Math.min(source.maxzoom || 18, 14)
          });
        } catch (error) {
          console.warn(`Failed to optimize source ${sourceId}:`, error);
        }
      }
    });
  }

  /**
   * Очистка ресурсов для освобождения памяти
   */
  private cleanupResources(): void {
    if (!this.map) return;

    // Очистка кэша тайлов
    try {
      this.map.getStyle().sources && this.map.removeSource('mapbox-dem');
    } catch (error) {
      // Источник может не существовать
    }

    // Принудительная сборка мусора (если доступна)
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  /**
   * Включение отсечения невидимых тайлов
   */
  private enableTileCulling(): void {
    if (!this.map) return;

    // Устанавливаем более агрессивное отсечение тайлов
    const currentBounds = this.map.getBounds();
    const padding = 0.1; // Уменьшаем отступ для отсечения

    this.map.setMaxBounds([
      [currentBounds.getWest() - padding, currentBounds.getSouth() - padding],
      [currentBounds.getEast() + padding, currentBounds.getNorth() + padding]
    ]);
  }

  /**
   * Создание отчета о производительности
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    
    return `
Map Performance Report:
======================
Load Time: ${metrics.loadTime.toFixed(2)}ms
Tile Load Time: ${metrics.tileLoadTime.toFixed(2)}ms
Render Time: ${metrics.renderTime.toFixed(2)}ms
Memory Usage: ${metrics.memoryUsage ? metrics.memoryUsage.toFixed(2) + 'MB' : 'N/A'}
Visible Tiles: ${metrics.visibleTiles}

Recommendations:
${metrics.loadTime > 3000 ? '- Consider using vector tiles for better performance\n' : ''}
${metrics.memoryUsage && metrics.memoryUsage > 100 ? '- Memory usage is high, consider data optimization\n' : ''}
${metrics.visibleTiles > 100 ? '- High tile count, enable tile culling\n' : ''}
`;
  }
}

/**
 * Фабрика для создания монитора производительности
 */
export function createPerformanceMonitor(map: any): MapPerformanceMonitor {
  return new MapPerformanceMonitor(map);
}

/**
 * Утилиты для оптимизации загрузки данных
 */
export const mapOptimizations = {
  /**
   * Дебаунс для обновления карты
   */
  debounceMapUpdate: (fn: Function, delay: number = 300) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  },

  /**
   * Throttle для событий карты
   */
  throttleMapEvent: (fn: Function, limit: number = 100) => {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        fn.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Оптимизация GeoJSON данных
   */
  optimizeGeoJSON: (geojson: any, precision: number = 6): any => {
    const roundCoordinate = (coord: number) => 
      Math.round(coord * Math.pow(10, precision)) / Math.pow(10, precision);

    const optimizeCoordinates = (coords: any): any => {
      if (Array.isArray(coords[0])) {
        return coords.map(optimizeCoordinates);
      }
      return [roundCoordinate(coords[0]), roundCoordinate(coords[1])];
    };

    return {
      ...geojson,
      features: geojson.features.map((feature: any) => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: optimizeCoordinates(feature.geometry.coordinates)
        }
      }))
    };
  }
};