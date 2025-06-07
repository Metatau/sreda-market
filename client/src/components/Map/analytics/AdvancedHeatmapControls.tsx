import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Layers, TrendingUp, MapPin, Activity, DollarSign } from 'lucide-react';
import { AdvancedHeatmapMode } from '../types/geospatial';

interface AdvancedHeatmapControlsProps {
  mode: AdvancedHeatmapMode;
  onModeChange: (mode: AdvancedHeatmapMode) => void;
  intensity: number;
  onIntensityChange: (intensity: number) => void;
  propertyCount: number;
}

const heatmapModes = [
  {
    value: 'none' as AdvancedHeatmapMode,
    label: 'Обычная карта',
    icon: MapPin,
    description: 'Стандартное отображение объектов'
  },
  {
    value: 'price_per_sqm' as AdvancedHeatmapMode,
    label: 'Цена за м²',
    icon: DollarSign,
    description: 'Тепловая карта стоимости квадратного метра'
  },
  {
    value: 'roi_potential' as AdvancedHeatmapMode,
    label: 'ROI потенциал',
    icon: TrendingUp,
    description: 'Инвестиционная доходность'
  },
  {
    value: 'liquidity_index' as AdvancedHeatmapMode,
    label: 'Индекс ликвидности',
    icon: Activity,
    description: 'Скорость продажи недвижимости'
  },
  {
    value: 'price_growth_trend' as AdvancedHeatmapMode,
    label: 'Тренд роста цен',
    icon: TrendingUp,
    description: 'Прогноз изменения стоимости'
  },
  {
    value: 'rental_yield' as AdvancedHeatmapMode,
    label: 'Доходность аренды',
    icon: DollarSign,
    description: 'Процент годовой доходности от сдачи в аренду'
  },
  {
    value: 'infrastructure_score' as AdvancedHeatmapMode,
    label: 'Оценка инфраструктуры',
    icon: MapPin,
    description: 'Развитость инфраструктуры района'
  },
  {
    value: 'transport_accessibility' as AdvancedHeatmapMode,
    label: 'Транспортная доступность',
    icon: MapPin,
    description: 'Близость к транспортным узлам'
  }
];

export function AdvancedHeatmapControls({
  mode,
  onModeChange,
  intensity,
  onIntensityChange,
  propertyCount
}: AdvancedHeatmapControlsProps) {
  const currentMode = heatmapModes.find(m => m.value === mode);

  return (
    <Card className="w-80 bg-white/95 backdrop-blur-sm border shadow-lg">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Тепловая карта</h3>
          <Badge variant="secondary" className="ml-auto">
            {propertyCount} объектов
          </Badge>
        </div>

        {/* Mode Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Режим визуализации</label>
          <Select value={mode} onValueChange={onModeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {heatmapModes.map((modeOption) => {
                const Icon = modeOption.icon;
                return (
                  <SelectItem key={modeOption.value} value={modeOption.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{modeOption.label}</div>
                        <div className="text-xs text-gray-500">{modeOption.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Current Mode Info */}
        {currentMode && mode !== 'none' && (
          <div className="p-3 bg-blue-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <currentMode.icon className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">{currentMode.label}</span>
            </div>
            <p className="text-sm text-blue-700">{currentMode.description}</p>
          </div>
        )}

        {/* Intensity Control */}
        {mode !== 'none' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Интенсивность</label>
              <span className="text-sm text-gray-500">{intensity.toFixed(1)}x</span>
            </div>
            <Slider
              value={[intensity]}
              onValueChange={(value) => onIntensityChange(value[0])}
              min={0.1}
              max={3}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Слабая</span>
              <span>Сильная</span>
            </div>
          </div>
        )}

        {/* Legend */}
        {mode !== 'none' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Легенда</label>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-gradient-to-r from-blue-200 to-blue-600 rounded"></div>
                <span className="text-xs text-gray-600">Низкий</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-gradient-to-r from-yellow-400 to-red-600 rounded"></div>
                <span className="text-xs text-gray-600">Высокий</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}