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

    console.log('Active map tool changed:', activeMapTool);

    switch (activeMapTool) {
      case 'heatmap':
        // Активируем тепловую карту по умолчанию (цены)
        console.log('Activating heatmap mode (price)');
        setHeatmapMode('price');
        break;
      
      case 'geoanalysis':
        // Очищаем тепловые карты и подготавливаем для геоанализа
        console.log('Activating geoanalysis mode');
        setHeatmapMode('density');
        break;
      
      case 'investment':
        // Активируем инвестиционную тепловую карту
        console.log('Activating investment mode');
        setHeatmapMode('investment');
        break;
      
      case 'none':
      default:
        // Очищаем все дополнительные слои
        console.log('Clearing all map layers');
        setHeatmapMode('none');
        break;
    }
  }, [activeMapTool, mapId, mapLoaded]);

  // Update properties on map
  useEffect(() => {
    console.log('PropertyMap: mapId:', mapId, 'mapLoaded:', mapLoaded, 'properties count:', properties.length);
    
    if (!mapId || !mapLoaded || !properties.length) return;

    const updateProperties = async () => {
      const propertyMarkers = properties
        .filter(p => p.coordinates && p.coordinates.trim() !== '')
        .map(property => {
          let lat: number, lng: number;
          
          try {
            // Парсинг координат в зависимости от формата
            if (property.coordinates!.startsWith('POINT(')) {
              // Формат: POINT(longitude latitude)
              const coords = property.coordinates!.match(/POINT\(([^)]+)\)/)?.[1];
              if (coords) {
                const [longitude, latitude] = coords.split(' ').map(Number);
                lng = longitude;
                lat = latitude;
              } else {
                console.warn(`Invalid POINT format for property ${property.id}:`, property.coordinates);
                return null;
              }
            } else {
              // Формат: "latitude,longitude" или "longitude,latitude"
              const parts = property.coordinates!.split(',').map(s => parseFloat(s.trim()));
              if (parts.length !== 2 || parts.some(isNaN)) {
                console.warn(`Invalid coordinate format for property ${property.id}:`, property.coordinates);
                return null;
              }
              
              // Проверяем, какой формат используется по диапазону значений
              // Москва: lat ~55.7, lng ~37.6
              // Питер: lat ~59.9, lng ~30.4
              if (Math.abs(parts[0]) > Math.abs(parts[1])) {
                // Первое значение больше - вероятно longitude, latitude
                lng = parts[0];
                lat = parts[1];
              } else {
                // Первое значение меньше - вероятно latitude, longitude
                lat = parts[0];
                lng = parts[1];
              }
            }

            // Валидация координат (примерные границы России)
            if (lat < 41 || lat > 82 || lng < 19 || lng > 180) {
              console.warn(`Coordinates out of bounds for property ${property.id}: lat=${lat}, lng=${lng}`);
              return null;
            }

            console.log(`Processing property ${property.id} with coordinates: lat=${lat}, lng=${lng}`);

            // Добавляем небольшое смещение для объектов с одинаковыми координатами
            // чтобы они не накладывались друг на друга
            const sameCoordProperties = properties.filter(p => {
              if (!p.coordinates || p.id === property.id) return false;
              
              let otherLat: number, otherLng: number;
              try {
                if (p.coordinates.startsWith('POINT(')) {
                  const coords = p.coordinates.match(/POINT\(([^)]+)\)/)?.[1];
                  if (coords) {
                    const [longitude, latitude] = coords.split(' ').map(Number);
                    otherLng = longitude;
                    otherLat = latitude;
                  } else {
                    return false;
                  }
                } else {
                  const parts = p.coordinates.split(',').map(s => parseFloat(s.trim()));
                  if (parts.length !== 2 || parts.some(isNaN)) return false;
                  
                  if (Math.abs(parts[0]) > Math.abs(parts[1])) {
                    otherLng = parts[0];
                    otherLat = parts[1];
                  } else {
                    otherLat = parts[0];
                    otherLng = parts[1];
                  }
                }
                
                // Проверяем, совпадают ли координаты (с точностью до 4 знаков)
                const isSame = Math.abs(lat - otherLat) < 0.0001 && Math.abs(lng - otherLng) < 0.0001;
                if (isSame) {
                  console.log(`Found duplicate coords: Property ${property.id} matches ${p.id} at ${lat},${lng}`);
                }
                return isSame;
              } catch {
                return false;
              }
            });

            console.log(`Property ${property.id}: Found ${sameCoordProperties.length} properties with same coordinates`);

            // Если есть объекты с такими же координатами, добавляем смещение
            if (sameCoordProperties.length > 0) {
              const index = sameCoordProperties.filter(p => p.id < property.id).length;
              const offset = 0.003; // Увеличиваем смещение до ~300 метров
              const angle = (index * 2 * Math.PI) / (sameCoordProperties.length + 1); // Распределяем по кругу
              const originalLat = lat;
              const originalLng = lng;
              lat += offset * Math.cos(angle);
              lng += offset * Math.sin(angle);
              console.log(`Applied offset for property ${property.id}: from ${originalLat},${originalLng} to ${lat},${lng} (offset=${offset}, angle=${angle})`);
            }
            
            return {
              id: property.id,
              coordinates: [lat, lng] as [number, number], // Leaflet использует [lat, lng]
              popup: property,
              className: 'default',
              price: property.price
            };
          } catch (error) {
            console.warn(`Error parsing coordinates for property ${property.id}:`, error);
            return null;
          }
        })
        .filter(Boolean) as Array<{
          id: number;
          coordinates: [number, number];
          popup: any;
          className: string;
          price: number;
        }>;

      console.log('PropertyMap: Processing', propertyMarkers.length, 'valid markers from', properties.length, 'properties');
      if (propertyMarkers.length > 0) {
        console.log('PropertyMap: Sample marker:', propertyMarkers[0]);
      }

      if (propertyMarkers.length === 0) {
        console.warn('No valid property coordinates found');
        return;
      }

      const result = leafletMapService.addPropertyMarkers(mapId, propertyMarkers, {
        onMarkerClick: (property: any) => {
          onPropertySelect?.(property);
        },
        getMarkerColor: (className: string) => getPropertyClassColor(className)
      });
      
      if (!result) {
        console.warn('Failed to add property markers to map');
      } else {
        console.log('Successfully added', propertyMarkers.length, 'property markers to map');
        
        // Автоматически подгоняем карту под все маркеры
        setTimeout(() => {
          const success = leafletMapService.fitToMarkers(mapId, 20);
          if (success) {
            console.log('Map fitted to show all markers with minimal padding');
            // После подгонки добавляем немного зума для лучшей видимости
            setTimeout(() => {
              const mapInstance = leafletMapService.maps.get(mapId);
              if (mapInstance) {
                const currentZoom = mapInstance.leafletMap.getZoom();
                const newZoom = Math.max(3, currentZoom - 1); // Минимум 3-й зум
                mapInstance.leafletMap.setZoom(newZoom);
                console.log(`Adjusted zoom from ${currentZoom} to ${newZoom} for better marker visibility`);
              }
            }, 200);
          } else {
            console.warn('Failed to fit map to markers');
          }
        }, 100);
      }
    };

    updateProperties();
  }, [mapId, mapLoaded, properties, onPropertySelect]);

  // Sync with external tool state
  useEffect(() => {
    if (activeMapTool === 'heatmap' && heatmapMode === 'none') {
      setHeatmapMode('price'); // Default to price mode when heatmap tool is activated
    } else if (activeMapTool !== 'heatmap' && heatmapMode !== 'none') {
      setHeatmapMode('none'); // Disable heatmap when tool is deactivated
    }
  }, [activeMapTool]);

  // Handle heatmap mode changes
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    const updateHeatmap = async () => {
      try {
        if (heatmapMode === 'none') {
          leafletMapService.removeHeatmap(mapId);
          return;
        }

        console.log('Generating heatmap data for', properties.length, 'properties in mode:', heatmapMode);
        
        const heatmapData = properties
        .filter(p => {
          const hasCoords = p.coordinates && p.coordinates.trim() !== '';
          if (!hasCoords) {
            console.log(`Property ${p.id} has no coordinates`);
          }
          return hasCoords;
        })
        .map(property => {
          let lat: number, lng: number;
          
          try {
            // Парсинг координат в зависимости от формата
            if (property.coordinates!.startsWith('POINT(')) {
              // Формат: POINT(longitude latitude)
              const coords = property.coordinates!.match(/POINT\(([^)]+)\)/)?.[1];
              if (coords) {
                const [longitude, latitude] = coords.split(' ').map(Number);
                lng = longitude;
                lat = latitude;
              } else {
                console.warn(`Invalid POINT format for property ${property.id}:`, property.coordinates);
                return null;
              }
            } else {
              // Формат: "latitude,longitude" или "longitude,latitude"
              const parts = property.coordinates!.split(',').map(s => parseFloat(s.trim()));
              if (parts.length !== 2 || parts.some(isNaN)) {
                console.warn(`Invalid coordinate format for property ${property.id}:`, property.coordinates);
                return null;
              }
              
              // Определяем порядок координат по диапазону
              if (Math.abs(parts[0]) > Math.abs(parts[1])) {
                lng = parts[0];
                lat = parts[1];
              } else {
                lat = parts[0];
                lng = parts[1];
              }
            }

            // Валидация координат
            if (lat < 41 || lat > 82 || lng < 19 || lng > 180) {
              console.warn(`Coordinates out of bounds for property ${property.id}: lat=${lat}, lng=${lng}`);
              return null;
            }

            let intensity = 0.5;
            
            // Разные алгоритмы расчета интенсивности для разных режимов
            switch (heatmapMode) {
              case 'price':
                // Нормализация цены от 0 до 1
                const validPrices = properties.map(p => p.price).filter(p => p > 0);
                if (validPrices.length > 0) {
                  const maxPrice = Math.max(...validPrices);
                  const minPrice = Math.min(...validPrices);
                  intensity = maxPrice > minPrice ? 
                    (property.price - minPrice) / (maxPrice - minPrice) : 0.5;
                  intensity = Math.max(0.1, Math.min(1, intensity));
                }
                break;
              case 'density':
                // Показываем одинаковую интенсивность для всех объектов (плотность)
                intensity = 0.8;
                break;
              case 'investment':
                // Расчет инвестиционного потенциала на основе цены за кв.м
                const area = parseFloat(property.area || '50');
                const pricePerSqm = property.pricePerSqm || (property.price / area);
                
                const validPricePerSqm = properties
                  .map(p => p.pricePerSqm || (p.price / parseFloat(p.area || '50')))
                  .filter(p => p > 0);
                
                if (validPricePerSqm.length > 0) {
                  const maxPricePerSqm = Math.max(...validPricePerSqm);
                  const minPricePerSqm = Math.min(...validPricePerSqm);
                  
                  // Инвертируем значение - меньшая цена = больший потенциал
                  intensity = maxPricePerSqm > minPricePerSqm ? 
                    1 - ((pricePerSqm - minPricePerSqm) / (maxPricePerSqm - minPricePerSqm)) : 0.6;
                  intensity = Math.max(0.2, Math.min(1, intensity));
                }
                break;
            }

            const finalIntensity = intensity * heatmapIntensity;
            console.log(`Heatmap point for property ${property.id}: lat=${lat}, lng=${lng}, intensity=${finalIntensity}`);
            return { lat, lng, intensity: finalIntensity };
          } catch (error) {
            console.warn(`Error processing property ${property.id} for heatmap:`, error);
            return null;
          }
        })
        .filter(Boolean) as Array<{lat: number, lng: number, intensity: number}>;

        console.log('Creating heatmap with', heatmapData.length, 'points in mode:', heatmapMode);
        
        leafletMapService.addHeatmap(mapId, heatmapData, {
          radius: 300,
          blur: 15,
          maxZoom: 17,
          mode: heatmapMode
        });
        
        console.log('Heatmap created successfully');
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
        let lat: number, lng: number;
        
        try {
          // Парсинг координат в зависимости от формата
          if (selectedProperty.coordinates.startsWith('POINT(')) {
            // Формат: POINT(longitude latitude)
            const coords = selectedProperty.coordinates.match(/POINT\(([^)]+)\)/)?.[1];
            if (coords) {
              const [longitude, latitude] = coords.split(' ').map(Number);
              lng = longitude;
              lat = latitude;
            } else {
              console.warn('Invalid POINT format for selected property:', selectedProperty.coordinates);
              return;
            }
          } else {
            // Формат: "latitude,longitude" или "longitude,latitude"
            const parts = selectedProperty.coordinates.split(',').map(s => parseFloat(s.trim()));
            if (parts.length !== 2 || parts.some(isNaN)) {
              console.warn('Invalid coordinate format for selected property:', selectedProperty.coordinates);
              return;
            }
            
            // Определяем порядок координат по диапазону
            if (Math.abs(parts[0]) > Math.abs(parts[1])) {
              lng = parts[0];
              lat = parts[1];
            } else {
              lat = parts[0];
              lng = parts[1];
            }
          }

          // Валидация координат
          if (lat < 41 || lat > 82 || lng < 19 || lng > 180) {
            console.warn('Coordinates out of bounds for selected property:', lat, lng);
            return;
          }

          leafletMapService.highlightMarker(mapId, selectedProperty.id, { lat, lng });
        } catch (error) {
          console.warn('Error highlighting selected property:', error);
        }
      }
    };

    highlightProperty();
  }, [mapId, selectedProperty]);

  return (
    <div className="relative w-full h-[500px] overflow-hidden">
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg"
        style={{ height: '500px' }}
      />
      
      {/* Map Controls Panel */}
      <div className="absolute top-4 right-4 bottom-4 bg-white rounded-lg shadow-lg p-4 space-y-4 min-w-[200px] max-h-[calc(100%-2rem)] overflow-y-auto">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Инструменты карты
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
              {properties.length} объектов
            </span>
          </h3>
          
          {/* Zoom Controls */}
          <div className="space-y-2 mb-4">
            <button
              onClick={() => {
                if (mapId) {
                  leafletMapService.fitToMarkers(mapId, 50);
                }
              }}
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              🗺️ Показать все объекты
            </button>
            <button
              onClick={() => {
                // Фокус на текущем регионе
                if (properties.length > 0) {
                  const regionProperties = properties.slice(0, Math.min(4, properties.length));
                  const bounds = regionProperties.map(p => {
                    let lat: number, lng: number;
                    
                    if (p.coordinates?.startsWith('POINT(')) {
                      const coords = p.coordinates.match(/POINT\(([^)]+)\)/)?.[1];
                      if (coords) {
                        const [longitude, latitude] = coords.split(' ').map(Number);
                        return [latitude, longitude];
                      }
                    }
                    
                    return null;
                  }).filter(Boolean);
                  
                  if (bounds.length > 0) {
                    const avgLat = bounds.reduce((sum, coord) => sum + coord[0], 0) / bounds.length;
                    const avgLng = bounds.reduce((sum, coord) => sum + coord[1], 0) / bounds.length;
                    leafletMapService.setView(mapId, [avgLat, avgLng], 11);
                  }
                }
              }}
              className="w-full px-3 py-2 text-sm rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            >
              📍 Фокус на регионе
            </button>
          </div>
          
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