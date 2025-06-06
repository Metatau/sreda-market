import { useState, useRef } from 'react';
import type { Property } from '@/types';

type HeatmapMode = 'none' | 'price' | 'density' | 'investment';

export function useMapState() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('none');
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(1);
  const [selectedPropertyState, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);


  return {
    mapContainer,
    mapId,
    setMapId,
    mapLoaded,
    setMapLoaded,
    heatmapMode,
    setHeatmapMode,
    heatmapIntensity,
    setHeatmapIntensity,
    selectedPropertyState,
    setSelectedProperty,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching
  };
}