import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Layers, DollarSign, TrendingUp, Grid3X3 } from 'lucide-react';

interface LayerControlsProps {
  activeLayer: string;
  onLayerChange: (layer: string) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  availableLayers: Array<{ id: string; name: string; icon: string }>;
  className?: string;
}

const iconMap = {
  Layers,
  DollarSign,
  TrendingUp,
  Grid3X3
};

export function LayerControls({
  activeLayer,
  onLayerChange,
  opacity,
  onOpacityChange,
  availableLayers,
  className = ''
}: LayerControlsProps) {
  return (
    <Card className={`bg-white/90 backdrop-blur-sm ${className}`}>
      <CardContent className="p-3 space-y-3">
        {/* Layer Title */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="w-4 h-4" />
          <span>Слои</span>
        </div>

        {/* Layer Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {availableLayers.map(layer => {
            const IconComponent = iconMap[layer.icon as keyof typeof iconMap] || Layers;
            const isActive = activeLayer === layer.id;
            
            return (
              <Button
                key={layer.id}
                size="sm"
                variant={isActive ? "default" : "outline"}
                onClick={() => onLayerChange(layer.id)}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <IconComponent className="w-3 h-3" />
                <span className="text-xs">{layer.name}</span>
              </Button>
            );
          })}
        </div>

        {/* Active Layer Info */}
        {activeLayer !== 'none' && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Активный слой</span>
              <Badge variant="secondary" className="text-xs">
                {availableLayers.find(l => l.id === activeLayer)?.name}
              </Badge>
            </div>

            {/* Opacity Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">Прозрачность</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={([value]) => onOpacityChange(value)}
                min={0.1}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}