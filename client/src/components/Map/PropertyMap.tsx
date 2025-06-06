import { useEffect, useRef, useState } from 'react';
import type { Property } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Layers, Search, BarChart3, Maximize2 } from 'lucide-react';
import { safePromise } from '@/lib/errorHandling';
import { trackMapEvent } from '@/lib/yandexMetrika';
import { leafletMapService } from '@/services/leafletMapService';
import { openStreetMapService } from '@/services/openStreetMapService';
import { Input } from '@/components/ui/input';
import { FullscreenMapModal } from './FullscreenMapModal';

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
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(1);
  const [selectedPropertyState, setSelectedProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapId) return;

    const initializeMap = async () => {
      try {
        const loadStartTime = performance.now();
        const defaultCenter: [number, number] = [60.6122, 56.8431]; // Екатеринбург
        const defaultZoom = 11;
        
        const newMapId = await leafletMapService.createMap(mapContainer.current!, {
          center: defaultCenter,
          zoom: defaultZoom,
          maxZoom: 18,
          minZoom: 3
        });

        setMapId(newMapId);
        setMapLoaded(true);

        // Отслеживаем загрузку карты
        safePromise(Promise.resolve(trackMapEvent('load', {
          center: defaultCenter,
          zoom: defaultZoom
        })));

        // Добавляем обработчики событий
        leafletMapService.addEventListener(newMapId, 'click', (e: any) => {
          safePromise(Promise.resolve(trackMapEvent('map_click', {
            coordinates: [e.latlng.lng, e.latlng.lat]
          })));
        });

        leafletMapService.addEventListener(newMapId, 'zoomend', (e: any) => {
          const zoom = leafletMapService.getZoom(newMapId);
          safePromise(Promise.resolve(trackMapEvent('zoom_change', { zoom })));
        });

        // Отслеживаем время загрузки
        const loadTime = performance.now() - loadStartTime;
        safePromise(Promise.resolve(trackMapEvent('performance_metric', {
          metric: 'map_load_time',
          value: loadTime,
          unit: 'ms'
        })));

      } catch (error) {
        console.error('Error initializing map:', error);
        setMapLoaded(true); // Устанавливаем true даже при ошибке для показа UI
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
    if (!mapId || !mapLoaded) return;
    
    const updateMapData = async () => {
      try {
        // Очищаем существующие маркеры
        leafletMapService.clearMarkers(mapId);
        
        if (properties.length === 0) return;
        
        // Добавляем маркеры для свойств
        properties.forEach((property) => {
          if (property.coordinates) {
            const [lon, lat] = property.coordinates.split(',').map(Number);
            if (leafletMapService.getMap(mapId) && !isNaN(lon) && !isNaN(lat)) {
              leafletMapService.addMarker(mapId, [lon, lat], {
                title: property.title,
                popup: `
                  <div style="min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-weight: bold;">${property.title}</h3>
                    <p style="margin: 0 0 4px 0;">Цена: ${property.price?.toLocaleString()} ₽</p>
                    ${property.pricePerSqm ? `<p style="margin: 0 0 4px 0;">За м²: ${property.pricePerSqm.toLocaleString()} ₽</p>` : ''}
                    ${property.rooms ? `<p style="margin: 0 0 4px 0;">Комнат: ${property.rooms}</p>` : ''}
                    ${property.propertyClass ? `<p style="margin: 0;"><span style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${property.propertyClass.name}</span></p>` : ''}
                  </div>
                `,
                clickable: true
              });
            }
          }
        });
        
        // Подгоняем карту под маркеры
        if (properties.length > 0) {
          leafletMapService.fitToMarkers(mapId, 50);
        }
        
      } catch (error) {
        console.error('Error updating map data:', error);
      }
    };

    updateMapData();
  }, [properties, mapLoaded, mapId]);

  // Поиск адресов
  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await openStreetMapService.searchAddresses(query, {
        countrycodes: 'ru',
        limit: 5,
        region: 'russia'
      });
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Переход к найденному адресу
  const handleSelectSearchResult = (result: any) => {
    if (!mapId) return;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    leafletMapService.setView(mapId, [lon, lat], 15);
    leafletMapService.addMarker(mapId, [lon, lat], {
      title: 'Найденный адрес',
      popup: openStreetMapService.formatAddress(result)
    });

    setSearchQuery('');
    setSearchResults([]);
    
    safePromise(Promise.resolve(trackMapEvent('address_search', { 
      query: result.display_name 
    })));
  };

  // Очистка поиска при клике вне
  useEffect(() => {
    const handleClickOutside = () => {
      if (searchResults.length > 0) {
        setSearchResults([]);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [searchResults.length]);

  // Update selected property
  useEffect(() => {
    if (selectedProperty) {
      setSelectedProperty(selectedProperty);
    }
  }, [selectedProperty]);

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />

      {/* Floating Fullscreen Button - Always Visible */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="default"
          size="lg"
          onClick={() => {
            console.log('Fullscreen button clicked');
            setShowFullscreenModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl border-2 border-white"
        >
          <Maximize2 className="h-5 w-5 mr-2" />
          Полный экран
        </Button>
      </div>

      {/* Map Controls */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 z-10 space-y-2 max-w-xs">

          {/* Search Control */}
          <Card className="p-2">
            <div className="flex items-center space-x-2 mb-2">
              <Search className="h-4 w-4" />
              <span className="text-sm font-medium">Поиск адресов</span>
            </div>
            <div className="relative">
              <Input
                type="text"
                placeholder="Введите адрес..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-64"
                disabled={isSearching}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto z-50">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                      onClick={() => handleSelectSearchResult(result)}
                    >
                      {openStreetMapService.formatAddress(result)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>



          {/* Map Info */}
          <Card className="p-2">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">Статистика</span>
            </div>
            <div className="space-y-1 mt-2 text-xs">
              <div>Объектов на карте: {properties.length}</div>
              <div>Источник: OpenStreetMap</div>
              {mapId && (
                <>
                  <div>Центр: {leafletMapService.getCenter(mapId)?.map(coord => coord.toFixed(4)).join(', ')}</div>
                  <div>Зум: {leafletMapService.getZoom(mapId)}</div>
                </>
              )}
            </div>
          </Card>

          {/* Analytics Card */}
          {selectedPropertyState && (
            <Card className="p-2 max-w-xs">
              <CardContent className="p-0">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Выбранный объект</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-medium">{selectedPropertyState.title}</div>
                  <div>Цена: {selectedPropertyState.price?.toLocaleString()} ₽</div>
                  {selectedPropertyState.pricePerSqm && (
                    <div>За м²: {selectedPropertyState.pricePerSqm.toLocaleString()} ₽</div>
                  )}
                  {selectedPropertyState.rooms && (
                    <div>Комнат: {selectedPropertyState.rooms}</div>
                  )}
                  {selectedPropertyState.propertyClass && (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getPropertyClassColor(selectedPropertyState.propertyClass.name)}`}
                    >
                      {selectedPropertyState.propertyClass.name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Загрузка карты...</p>
          </div>
        </div>
      )}

      {/* Fullscreen Map Modal */}
      <FullscreenMapModal
        isOpen={showFullscreenModal}
        onClose={() => setShowFullscreenModal(false)}
        properties={properties}
        selectedProperty={selectedProperty}
        onPropertySelect={onPropertySelect}
      />
    </div>
  );
}