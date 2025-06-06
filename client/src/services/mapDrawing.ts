// Mapbox GL Draw service for polygon drawing and area search
export interface DrawingConfig {
  defaultMode: 'simple_select' | 'draw_polygon' | 'draw_rectangle';
  controls: {
    polygon: boolean;
    trash: boolean;
    combine_features: boolean;
    uncombine_features: boolean;
  };
  styles: any[];
}

export interface DrawnArea {
  id: string;
  type: 'Polygon' | 'Rectangle';
  coordinates: number[][][];
  area: number; // в квадратных метрах
  properties: Record<string, any>;
}

export class MapDrawingService {
  private draw: any;
  private map: any;
  private config: DrawingConfig;
  private onAreaDrawn?: (area: DrawnArea) => void;

  constructor(config?: Partial<DrawingConfig>) {
    this.config = {
      defaultMode: 'simple_select',
      controls: {
        polygon: true,
        trash: true,
        combine_features: false,
        uncombine_features: false
      },
      styles: this.getDefaultStyles(),
      ...config
    };
  }

  /**
   * Инициализация Mapbox GL Draw
   */
  initialize(map: any, onAreaDrawn?: (area: DrawnArea) => void): void {
    this.map = map;
    this.onAreaDrawn = onAreaDrawn;

    // Проверяем наличие MapboxDraw в глобальном объекте
    if (!window.MapboxDraw) {
      console.warn('Mapbox GL Draw not loaded. Include the library first.');
      return;
    }

    this.draw = new window.MapboxDraw({
      displayControlsDefault: false,
      controls: this.config.controls,
      defaultMode: this.config.defaultMode,
      styles: this.config.styles
    });

    // Добавляем контрол на карту
    this.map.addControl(this.draw, 'top-left');

    // Настраиваем обработчики событий
    this.setupEventHandlers();
  }

  /**
   * Настройка обработчиков событий
   */
  private setupEventHandlers(): void {
    // Событие создания нового полигона
    this.map.on('draw.create', (e: any) => {
      const feature = e.features[0];
      if (feature && this.onAreaDrawn) {
        const area = this.featureToDrawnArea(feature);
        this.onAreaDrawn(area);
      }
    });

    // Событие обновления полигона
    this.map.on('draw.update', (e: any) => {
      const feature = e.features[0];
      if (feature && this.onAreaDrawn) {
        const area = this.featureToDrawnArea(feature);
        this.onAreaDrawn(area);
      }
    });

    // Событие удаления полигона
    this.map.on('draw.delete', () => {
      // Очищаем область поиска
      if (this.onAreaDrawn) {
        this.onAreaDrawn(null as any);
      }
    });

    // Изменение режима
    this.map.on('draw.modechange', (e: any) => {
      console.log('Draw mode changed to:', e.mode);
    });
  }

  /**
   * Преобразование feature в DrawnArea
   */
  private featureToDrawnArea(feature: any): DrawnArea {
    const coordinates = feature.geometry.coordinates;
    const area = this.calculateArea(coordinates[0]);

    return {
      id: feature.id,
      type: feature.geometry.type,
      coordinates,
      area,
      properties: feature.properties || {}
    };
  }

  /**
   * Вычисление площади полигона
   */
  private calculateArea(coordinates: number[][]): number {
    // Простое вычисление площади по формуле Shoelace
    let area = 0;
    const n = coordinates.length;

    for (let i = 0; i < n - 1; i++) {
      area += coordinates[i][0] * coordinates[i + 1][1];
      area -= coordinates[i + 1][0] * coordinates[i][1];
    }

    area = Math.abs(area) / 2;

    // Приблизительное преобразование в квадратные метры
    // (очень упрощенное, для точных расчетов нужна геодезическая библиотека)
    const metersPerDegree = 111320; // на экваторе
    return area * metersPerDegree * metersPerDegree;
  }

  /**
   * Активация режима рисования полигона
   */
  startPolygonDrawing(): void {
    if (this.draw) {
      this.draw.changeMode('draw_polygon');
    }
  }

  /**
   * Активация режима рисования прямоугольника
   */
  startRectangleDrawing(): void {
    if (this.draw) {
      // Для прямоугольника используем стандартный режим полигона
      // В production можно добавить custom mode для прямоугольников
      this.draw.changeMode('draw_polygon');
    }
  }

  /**
   * Переключение в режим выбора
   */
  selectMode(): void {
    if (this.draw) {
      this.draw.changeMode('simple_select');
    }
  }

  /**
   * Очистка всех нарисованных объектов
   */
  clearAll(): void {
    if (this.draw) {
      this.draw.deleteAll();
    }
  }

  /**
   * Получение всех нарисованных областей
   */
  getAllAreas(): DrawnArea[] {
    if (!this.draw) return [];

    const features = this.draw.getAll();
    return features.features.map((feature: any) => this.featureToDrawnArea(feature));
  }

  /**
   * Проверка попадания точки в нарисованную область
   */
  isPointInAreas(longitude: number, latitude: number): boolean {
    const areas = this.getAllAreas();
    
    for (const area of areas) {
      if (this.isPointInPolygon([longitude, latitude], area.coordinates[0])) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Алгоритм Ray Casting для проверки точки в полигоне
   */
  private isPointInPolygon(point: number[], polygon: number[][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Получение стилей по умолчанию
   */
  private getDefaultStyles(): any[] {
    return [
      // Неактивный полигон (заливка)
      {
        id: 'gl-draw-polygon-fill-inactive',
        type: 'fill',
        filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
        paint: {
          'fill-color': '#3bb2d0',
          'fill-outline-color': '#3bb2d0',
          'fill-opacity': 0.1
        }
      },
      // Активный полигон (заливка)
      {
        id: 'gl-draw-polygon-fill-active',
        type: 'fill',
        filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        paint: {
          'fill-color': '#fbb03b',
          'fill-outline-color': '#fbb03b',
          'fill-opacity': 0.1
        }
      },
      // Контур полигона
      {
        id: 'gl-draw-polygon-stroke-active',
        type: 'line',
        filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#fbb03b',
          'line-dasharray': [0.2, 2],
          'line-width': 2
        }
      },
      // Неактивный контур
      {
        id: 'gl-draw-polygon-stroke-inactive',
        type: 'line',
        filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#3bb2d0',
          'line-width': 2
        }
      },
      // Вершины полигона
      {
        id: 'gl-draw-polygon-and-line-vertex-active',
        type: 'circle',
        filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
        paint: {
          'circle-radius': 5,
          'circle-color': '#fbb03b'
        }
      }
    ];
  }

  /**
   * Очистка ресурсов
   */
  cleanup(): void {
    if (this.draw && this.map) {
      this.map.removeControl(this.draw);
      this.draw = null;
    }
  }
}

/**
 * Фабрика для создания сервиса рисования
 */
export function createMapDrawingService(config?: Partial<DrawingConfig>): MapDrawingService {
  return new MapDrawingService(config);
}