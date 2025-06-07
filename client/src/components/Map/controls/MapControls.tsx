import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Map, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MapControlsProps {
  viewType: string;
  onViewChange: (viewType: string) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
}

export function MapControls({
  viewType,
  onViewChange,
  zoomLevel,
  onZoomChange,
  className = ''
}: MapControlsProps) {
  const viewTypes = [
    { value: 'standard', label: 'Стандарт' },
    { value: 'satellite', label: 'Спутник' },
    { value: 'hybrid', label: 'Гибрид' }
  ];

  return (
    <Card className={`bg-white/90 backdrop-blur-sm ${className}`}>
      <CardContent className="p-3 space-y-3">
        {/* View Type Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Map className="w-4 h-4" />
            <span>Тип карты</span>
          </div>
          <Select value={viewType} onValueChange={onViewChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {viewTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zoom Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Масштаб</span>
            <span className="text-xs text-muted-foreground">{zoomLevel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onZoomChange(zoomLevel - 1)}
              disabled={zoomLevel <= 1}
            >
              <ZoomOut className="w-3 h-3" />
            </Button>
            <div className="flex-1">
              <Slider
                value={[zoomLevel]}
                onValueChange={([value]) => onZoomChange(value)}
                min={1}
                max={18}
                step={1}
                className="w-full"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onZoomChange(zoomLevel + 1)}
              disabled={zoomLevel >= 18}
            >
              <ZoomIn className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onViewChange('standard');
            onZoomChange(10);
          }}
          className="w-full"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Сброс
        </Button>
      </CardContent>
    </Card>
  );
}