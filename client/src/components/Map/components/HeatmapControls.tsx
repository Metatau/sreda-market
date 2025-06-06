import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Thermometer } from 'lucide-react';

interface HeatmapControlsProps {
  heatmapType: string;
  onHeatmapTypeChange: (type: string) => void;
  intensity: number[];
  onIntensityChange: (value: number[]) => void;
}

export function HeatmapControls({
  heatmapType,
  onHeatmapTypeChange,
  intensity,
  onIntensityChange
}: HeatmapControlsProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="w-4 h-4" />
          Тепловые карты
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-2 block text-gray-600">
            Тип визуализации
          </label>
          <Select value={heatmapType} onValueChange={onHeatmapTypeChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не показывать</SelectItem>
              <SelectItem value="properties">Плотность объектов</SelectItem>
              <SelectItem value="price">Тепловая карта цен</SelectItem>
              <SelectItem value="investment">Инвестиционная привлекательность</SelectItem>
              <SelectItem value="social">Социальная инфраструктура</SelectItem>
              <SelectItem value="commercial">Коммерческая инфраструктура</SelectItem>
              <SelectItem value="transport">Транспортная доступность</SelectItem>
              <SelectItem value="combined">Общая инфраструктура</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {heatmapType !== 'none' && (
          <div>
            <label className="text-xs font-medium mb-2 block text-gray-600 flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              Интенсивность: {Math.round(intensity[0] * 100)}%
            </label>
            <Slider
              value={intensity}
              onValueChange={onIntensityChange}
              max={1}
              min={0.1}
              step={0.1}
              className="w-full"
            />
          </div>
        )}

        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
          Тепловые карты показывают концентрацию и интенсивность различных параметров на территории
        </div>
      </CardContent>
    </Card>
  );
}