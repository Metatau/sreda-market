import { useState, useMemo } from 'react';

export function useMapLayers(mode: string) {
  const [activeLayer, setActiveLayer] = useState<string>('none');
  const [layerOpacity, setLayerOpacity] = useState<number>(0.7);

  const availableLayers = useMemo(() => {
    const baseLayers = [
      { id: 'none', name: 'Без слоя', icon: 'Layers' },
      { id: 'price', name: 'Цены', icon: 'DollarSign' }
    ];

    if (mode === 'analytics') {
      baseLayers.push(
        { id: 'investment', name: 'Инвестиции', icon: 'TrendingUp' },
        { id: 'density', name: 'Плотность', icon: 'Grid3X3' }
      );
    }

    return baseLayers;
  }, [mode]);

  const handleLayerChange = (layerId: string) => {
    setActiveLayer(layerId);
  };

  const handleOpacityChange = (opacity: number) => {
    setLayerOpacity(Math.max(0, Math.min(1, opacity)));
  };

  return {
    activeLayer,
    setActiveLayer: handleLayerChange,
    layerOpacity,
    setLayerOpacity: handleOpacityChange,
    availableLayers
  };
}