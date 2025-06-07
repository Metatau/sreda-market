import React, { useEffect, useRef, useState } from 'react';
import type { Property } from '@/types';
import { leafletMapService } from '@/services/leafletMapService';
import { geolocationService } from '@/services/geolocationService';

export interface PropertyMapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
  regionId?: number | null;
  activeMapTool?: 'none' | 'heatmap' | 'geoanalysis' | 'investment';
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

export function PropertyMap({ properties, selectedProperty, onPropertySelect, regionId, activeMapTool = 'none' }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('none');
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.7);
  const [mapCenter, setMapCenter] = useState<[number, number]>([55.7558, 37.6176]); // Default: Moscow

  // Initialize map with geolocation or region-based positioning
  useEffect(() => {
    if (!mapContainer.current || mapId) return;

    const initializeMap = async () => {
      try {
        let center: [number, number] = [55.7558, 37.6176]; // Default: Moscow
        let zoom = 10;

        // Try to get coordinates based on regionId first
        if (regionId) {
          const regionCoordinates = geolocationService.getRegionCoordinates(regionId);
          if (regionCoordinates) {
            center = regionCoordinates;
            zoom = 12; // Closer zoom for specific regions
          }
        } else {
          // Fall back to user's geolocation
          try {
            const nearestCity = await geolocationService.getNearestCity();
            if (nearestCity) {
              center = nearestCity.coordinates;
              zoom = 11;
            }
          } catch (error) {
            console.log('Using default location (Moscow)');
          }
        }

        setMapCenter(center);
        
        const newMapId = await leafletMapService.createMap(mapContainer.current!, {
          center,
          zoom
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

  // Update map position when regionId changes
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    const updateMapPosition = async () => {
      let center: [number, number] = [55.7558, 37.6176]; // Default: Moscow
      let zoom = 10;

      if (regionId) {
        const regionCoordinates = geolocationService.getRegionCoordinates(regionId);
        if (regionCoordinates) {
          center = regionCoordinates;
          zoom = 12;
        }
      } else {
        try {
          const nearestCity = await geolocationService.getNearestCity();
          if (nearestCity) {
            center = nearestCity.coordinates;
            zoom = 11;
          }
        } catch (error) {
          console.log('Using default location (Moscow)');
        }
      }

      setMapCenter(center);
      leafletMapService.setView(mapId, center, zoom);
    };

    updateMapPosition();
  }, [regionId, mapId, mapLoaded]);

  // Handle active map tool changes
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    switch (activeMapTool) {
      case 'heatmap':
        // Активируем тепловую карту по умолчанию (цены)
        setHeatmapMode('price');
        break;
      
      case 'geoanalysis':
        // Очищаем тепловые карты и подготавливаем для геоанализа
        setHeatmapMode('none');
        // Здесь можно добавить специальные слои для геоанализа
        break;
      
      case 'investment':
        // Активируем инвестиционную тепловую карту
        setHeatmapMode('investment');
        break;
      
      case 'none':
      default:
        // Очищаем все дополнительные слои
        setHeatmapMode('none');
        break;
    }
  }, [activeMapTool, mapId, mapLoaded, properties, heatmapIntensity]);

  // Update properties on map
  useEffect(() => {
    console.log('PropertyMap: mapId:', mapId, 'mapLoaded:', mapLoaded, 'properties count:', properties.length);
    
    if (!mapId || !mapLoaded || !properties.length) return;

    const updateProperties = async () => {
      const propertyMarkers = properties
        .filter(p => p.coordinates)
        .map(property => {
          let lat: number, lng: number;
          
          // Парсинг координат в зависимости от формата
          if (property.coordinates!.startsWith('POINT(')) {
            // Формат: POINT(longitude latitude)
            const coords = property.coordinates!.match(/POINT\(([^)]+)\)/)?.[1];
            if (coords) {
              const [longitude, latitude] = coords.split(' ').map(Number);
              lng = longitude;
              lat = latitude;
            } else {
              return null; // Пропускаем некорректные координаты
            }
          } else {
            // Формат: "latitude,longitude"
            const [latitude, longitude] = property.coordinates!.split(',').map(Number);
            lat = latitude;
            lng = longitude;
          }
          
          return {
            id: property.id,
            coordinates: [lng, lat] as [number, number],
            popup: property,
            className: 'default',
            price: property.price
          };
        })
        .filter(Boolean) as Array<{
          id: number;
          coordinates: [number, number];
          popup: any;
          className: string;
          price: number;
        }>; // Убираем null значения и исправляем типизацию

      console.log('PropertyMap: Processing', propertyMarkers.length, 'markers');
      console.log('PropertyMap: Sample marker:', propertyMarkers[0]);

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
      try {
        if (heatmapMode === 'none') {
          if (typeof leafletMapService.removeHeatmap === 'function') {
            leafletMapService.removeHeatmap(mapId);
          }
          return;
        }

        const heatmapData = properties
        .filter(p => p.coordinates)
        .map(property => {
          let lat: number, lng: number;
          
          // Парсинг координат в зависимости от формата
          if (property.coordinates!.startsWith('POINT(')) {
            // Формат: POINT(longitude latitude)
            const coords = property.coordinates!.match(/POINT\(([^)]+)\)/)?.[1];
            if (coords) {
              const [longitude, latitude] = coords.split(' ').map(Number);
              lng = longitude;
              lat = latitude;
            } else {
              return null; // Пропускаем некорректные координаты
            }
          } else {
            // Формат: "latitude,longitude"
            const [latitude, longitude] = property.coordinates!.split(',').map(Number);
            lat = latitude;
            lng = longitude;
          }

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
        })
        .filter(Boolean) as Array<{lat: number, lng: number, intensity: number}>;

        if (typeof leafletMapService.addHeatmap === 'function') {
          leafletMapService.addHeatmap(mapId, heatmapData, {
            radius: 25,
            blur: 15,
            maxZoom: 17
          });
        }
      } catch (error) {
        console.warn('Error updating heatmap:', error);
      }
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
      
      {/* Map Controls Panel */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-4 min-w-[200px]">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Инструменты карты</h3>
          
          {/* Tool Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setHeatmapMode(heatmapMode === 'none' ? 'price' : 'none')}
              className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                heatmapMode === 'price' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌡️ Тепловая карта цен
            </button>
            
            <button
              onClick={() => setHeatmapMode(heatmapMode === 'density' ? 'none' : 'density')}
              className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                heatmapMode === 'density' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Плотность объектов
            </button>
            
            <button
              onClick={() => setHeatmapMode(heatmapMode === 'investment' ? 'none' : 'investment')}
              className={`w-full px-3 py-2 text-sm rounded-md transition-colors ${
                heatmapMode === 'investment' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📈 Инвест-потенциал
            </button>
          </div>
        </div>

        {/* Intensity Control */}
        {heatmapMode !== 'none' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Интенсивность: {Math.round(heatmapIntensity * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={heatmapIntensity}
              onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* Active Tool Info */}
        {heatmapMode !== 'none' && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            {heatmapMode === 'price' && '🟢 Зеленый = дешевле, 🔴 Красный = дороже'}
            {heatmapMode === 'density' && '📍 Показывает концентрацию объектов'}
            {heatmapMode === 'investment' && '💰 Анализ инвестиционной привлекательности'}
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