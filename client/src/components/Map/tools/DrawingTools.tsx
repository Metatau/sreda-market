import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Square, Circle, Ruler, Trash2, Pentagon, Square as Rectangle } from 'lucide-react';
import { DrawingTool, MeasurementResult } from '../types/geospatial';

interface DrawingToolsProps {
  activeTool: DrawingTool | null;
  onToolSelect: (tool: DrawingTool) => void;
  onClearAll: () => void;
  measurementResult: MeasurementResult | null;
  isDrawing: boolean;
}

export function DrawingTools({
  activeTool,
  onToolSelect,
  onClearAll,
  measurementResult,
  isDrawing
}: DrawingToolsProps) {
  const tools = [
    {
      type: 'polygon' as const,
      icon: Pentagon,
      label: 'Полигон',
      description: 'Выделить произвольную область'
    },
    {
      type: 'rectangle' as const,
      icon: Rectangle,
      label: 'Прямоугольник',
      description: 'Выделить прямоугольную область'
    },
    {
      type: 'circle' as const,
      icon: Circle,
      label: 'Круг',
      description: 'Выделить круглую область'
    },
    {
      type: 'line' as const,
      icon: Ruler,
      label: 'Измерение',
      description: 'Измерить расстояние'
    }
  ];

  return (
    <Card className="w-64 bg-white/95 backdrop-blur-sm border shadow-lg">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Инструменты</h3>
          {isDrawing && (
            <Badge variant="outline" className="animate-pulse">
              Рисование...
            </Badge>
          )}
        </div>

        {/* Drawing Tools */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Выделение областей</label>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool?.type === tool.type;
              
              return (
                <Button
                  key={tool.type}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`h-auto p-3 flex flex-col items-center gap-1 ${
                    isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onToolSelect({
                    type: tool.type,
                    isActive: !isActive,
                    data: null
                  })}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{tool.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        {activeTool && (
          <div className="p-3 bg-blue-50 rounded-lg border">
            <div className="text-sm text-blue-900">
              <strong>Инструкция:</strong>
              <div className="mt-1 text-blue-700">
                {activeTool.type === 'polygon' && 'Кликайте по карте для создания точек полигона. Двойной клик для завершения.'}
                {activeTool.type === 'rectangle' && 'Кликните и перетащите для создания прямоугольника.'}
                {activeTool.type === 'circle' && 'Кликните в центре и перетащите для создания круга.'}
                {activeTool.type === 'line' && 'Кликните в начальной точке, затем в конечной для измерения расстояния.'}
              </div>
            </div>
          </div>
        )}

        {/* Measurement Result */}
        {measurementResult && (
          <div className="p-3 bg-green-50 rounded-lg border">
            <div className="text-sm text-green-900">
              <strong>Результат измерения:</strong>
              <div className="mt-1 text-green-700">
                {measurementResult.type === 'distance' ? 'Расстояние: ' : 'Площадь: '}
                <span className="font-medium">{measurementResult.formattedValue}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Очистить
          </Button>
        </div>

        {/* Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Выделите область для получения статистики</div>
          <div>• Используйте измерения для анализа расстояний</div>
          <div>• Статистика обновляется автоматически</div>
        </div>
      </CardContent>
    </Card>
  );
}