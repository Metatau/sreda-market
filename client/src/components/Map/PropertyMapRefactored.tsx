import React, { useEffect, useRef, useState } from 'react';
import type { Property } from '@/types';
import { leafletMapService } from '@/services/leafletMapService';

export interface PropertyMapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
}

type HeatmapMode = 'none' | 'price' | 'density' | 'investment';

const getPropertyClassColor = (className: string): string => {
  const colors: Record<string, string> = {
    'Эконом': 'bg-blue-500',
    'Комфорт': 'bg-yellow-500',
    'Бизнес': 'bg-orange-500',
    'Элит': 'bg-red-500',
  };
  return colors[className] || 'bg-gray-500';
};

export function PropertyMap({ properties, selectedProperty, onPropertySelect }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('none');
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.7);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapId) return;

    const initializeMap = async () => {
      try {
        const newMapId = await leafletMapService.createMap(mapContainer.current!, {
          center: [55.7558, 37.6176], // Moscow
          zoom: 10
        });
        
        if (newMapId) {
          setMapId(newMapId);
          setMapLoaded(true);
        }
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    initializeMap();

    return () => {
      if (mapId) {
        leafletMapService.destroyMap(mapId);
      }
    };
  }, []);

  // Update properties on map
  useEffect(() => {
    if (!mapId || !mapLoaded || !properties.length) return;

    const updateProperties = async () => {
      const propertyMarkers = properties
        .filter(p => p.coordinates)
        .map(property => {
          const [lat, lng] = property.coordinates!.split(',').map(Number);
          
          return {
            id: property.id,
            coordinates: [lng, lat] as [number, number],
            popup: property,
            className: 'default',
            price: property.price
          };
        });

      const result = leafletMapService.addPropertyMarkers(mapId, propertyMarkers, {
        onMarkerClick: (property: any) => {
          onPropertySelect?.(property);
        },
        getMarkerColor: (className: string) => getPropertyClassColor(className)
      });
      
      if (!result) {
        console.warn('Failed to add property markers to map');
      }
    };

    updateProperties();
  }, [mapId, mapLoaded, properties, onPropertySelect]);

  // Handle heatmap mode changes
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    const updateHeatmap = async () => {
      if (heatmapMode === 'none') {
        leafletMapService.removeHeatmap(mapId);
        return;
      }

      const heatmapData = properties
        .filter(p => p.coordinates)
        .map(property => {
          const [lat, lng] = property.coordinates!.split(',').map(Number);
          let intensity = 0.5;

          switch (heatmapMode) {
            case 'price':
              intensity = Math.min(property.price / 50000000, 1); // Normalize price
              break;
            case 'density':
              intensity = 0.8; // Uniform density
              break;
            case 'investment':
              intensity = 0.6; // Default investment intensity
              break;
          }

          return { lat, lng, intensity: intensity * heatmapIntensity };
        });

      leafletMapService.addHeatmap(mapId, heatmapData, {
        radius: 25,
        blur: 15,
        maxZoom: 17
      });
    };

    updateHeatmap();
  }, [mapId, mapLoaded, heatmapMode, heatmapIntensity, properties]);

  // Handle selected property highlight
  useEffect(() => {
    if (!mapId || !selectedProperty) return;

    const highlightProperty = async () => {
      if (selectedProperty.coordinates) {
        const [lat, lng] = selectedProperty.coordinates.split(',').map(Number);
        leafletMapService.highlightMarker(mapId, selectedProperty.id, { lat, lng });
      }
    };

    highlightProperty();
  }, [mapId, selectedProperty]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Heatmap Mode
          </label>
          <select
            value={heatmapMode}
            onChange={(e) => setHeatmapMode(e.target.value as HeatmapMode)}
            className="w-full border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="none">None</option>
            <option value="price">Price</option>
            <option value="density">Density</option>
            <option value="investment">Investment</option>
          </select>
        </div>
        
        {heatmapMode !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Intensity: {Math.round(heatmapIntensity * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={heatmapIntensity}
              onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}
    </div>
  );
}