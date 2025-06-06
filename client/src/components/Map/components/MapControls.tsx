import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Layers, BarChart3, Maximize2 } from 'lucide-react';

type HeatmapMode = 'none' | 'price' | 'density' | 'investment';

interface MapControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  heatmapMode: HeatmapMode;
  onHeatmapModeChange: (mode: HeatmapMode) => void;
  heatmapIntensity: number;
  onHeatmapIntensityChange: (intensity: number) => void;
  onFullscreenToggle: () => void;
  isSearching: boolean;
}

export function MapControls({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  heatmapMode,
  onHeatmapModeChange,
  heatmapIntensity,
  onHeatmapIntensityChange,
  onFullscreenToggle,
  isSearching
}: MapControlsProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2">
      {/* Search Controls */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Поиск адреса..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearchSubmit()}
            className="pr-10"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={onSearchSubmit}
            disabled={isSearching}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onFullscreenToggle}
          className="px-3"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Map Layer Controls */}
      <div className="flex gap-2 items-center bg-white/90 backdrop-blur-sm rounded-lg p-2">
        <Layers className="h-4 w-4 text-gray-600" />
        <Select value={heatmapMode} onValueChange={(value: HeatmapMode) => onHeatmapModeChange(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Обычная карта</SelectItem>
            <SelectItem value="price">Тепловая карта цен</SelectItem>
            <SelectItem value="density">Плотность объектов</SelectItem>
            <SelectItem value="investment">Инвестиционный потенциал</SelectItem>
          </SelectContent>
        </Select>

        {heatmapMode !== 'none' && (
          <div className="flex items-center gap-2 ml-4">
            <BarChart3 className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">Интенсивность:</span>
            <div className="w-20">
              <Slider
                value={[heatmapIntensity]}
                onValueChange={(value) => onHeatmapIntensityChange(value[0])}
                min={0.1}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}