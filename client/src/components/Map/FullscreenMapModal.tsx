import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  X, 
  Search, 
  MapPin, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Navigation,
  BarChart3,
  Filter,
  Download
} from 'lucide-react';
import type { Property } from '@/types';
import { leafletMapService } from '@/services/leafletMapService';
import { openStreetMapService } from '@/services/openStreetMapService';
import { safePromise } from '@/lib/errorHandling';
import { trackMapEvent } from '@/lib/yandexMetrika';

interface FullscreenMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
}

type HeatmapMode = 'none' | 'price' | 'density' | 'investment';
type MapStyle = 'streets' | 'satellite' | 'terrain';

export function FullscreenMapModal({ 
  isOpen, 
  onClose, 
  properties, 
  selectedProperty, 
  onPropertySelect 
}: FullscreenMapModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('none');
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(1);
  const [selectedPropertyState, setSelectedProperty] = useState<Property | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [roomsFilter, setRoomsFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainer.current || mapId) return;

    const initializeMap = async () => {
      try {
        const loadStartTime = performance.now();
        const defaultCenter: [number, number] = [60.6122, 56.8431];
        const defaultZoom = 11;
        
        const newMapId = await leafletMapService.createMap(mapContainer.current!, {
          center: defaultCenter,
          zoom: defaultZoom,
          maxZoom: 18,
          minZoom: 3
        });

        setMapId(newMapId);
        setMapLoaded(true);

        // Track map initialization
        safePromise(Promise.resolve(trackMapEvent('fullscreen_map_opened', {
          center: defaultCenter,
          zoom: defaultZoom,
          properties_count: properties.length
        })));

        // Add event listeners
        leafletMapService.addEventListener(newMapId, 'click', (e: any) => {
          safePromise(Promise.resolve(trackMapEvent('fullscreen_map_click', {
            coordinates: [e.latlng.lng, e.latlng.lat]
          })));
        });

        leafletMapService.addEventListener(newMapId, 'zoomend', (e: any) => {
          const zoom = leafletMapService.getZoom(newMapId);
          safePromise(Promise.resolve(trackMapEvent('fullscreen_zoom_change', { zoom })));
        });

        const loadTime = performance.now() - loadStartTime;
        safePromise(Promise.resolve(trackMapEvent('performance_metric', {
          metric: 'fullscreen_map_load_time',
          value: loadTime,
          unit: 'ms'
        })));

      } catch (error) {
        console.error('Error initializing fullscreen map:', error);
        setMapLoaded(true);
      }
    };

    initializeMap();
  }, [isOpen]);

  // Only cleanup map when component unmounts
  useEffect(() => {
    return () => {
      if (mapId) {
        leafletMapService.destroyMap(mapId);
      }
    };
  }, []);

  // Filter properties based on current filters
  const filteredProperties = properties.filter(property => {
    if (priceRange[0] > 0 && property.price && property.price < priceRange[0]) return false;
    if (priceRange[1] < 10000000 && property.price && property.price > priceRange[1]) return false;
    if (roomsFilter !== 'all' && property.rooms?.toString() !== roomsFilter) return false;
    if (propertyTypeFilter !== 'all' && property.propertyType !== propertyTypeFilter) return false;
    return true;
  });

  // Update map markers when properties or filters change
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    const updateMapData = async () => {
      try {
        leafletMapService.clearMarkers(mapId);
        
        if (filteredProperties.length === 0) return;
        
        // Add markers in batches to improve performance
        const batchSize = 10;
        for (let i = 0; i < filteredProperties.length; i += batchSize) {
          const batch = filteredProperties.slice(i, i + batchSize);
          
          batch.forEach((property) => {
            if (property.coordinates) {
              const [lon, lat] = property.coordinates.split(',').map(Number);
              if (!isNaN(lon) && !isNaN(lat)) {
                const isSelected = selectedPropertyState?.id === property.id;
                
                leafletMapService.addMarker(mapId, [lon, lat], {
                  title: property.title,
                  popup: `
                    <div style="min-width: 250px; max-width: 300px;">
                      <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">${property.title}</h3>
                      <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 8px;">
                        <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #059669;">₽${property.price?.toLocaleString()}</p>
                        ${property.pricePerSqm ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">₽${property.pricePerSqm.toLocaleString()} за м²</p>` : ''}
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
                        ${property.rooms ? `<div><strong>Комнат:</strong> ${property.rooms}</div>` : ''}
                        ${property.area ? `<div><strong>Площадь:</strong> ${property.area} м²</div>` : ''}
                        ${property.floor ? `<div><strong>Этаж:</strong> ${property.floor}</div>` : ''}
                        ${property.propertyType ? `<div><strong>Тип:</strong> ${property.propertyType === 'apartment' ? 'Квартира' : 'Дом'}</div>` : ''}
                      </div>
                      ${property.address ? `<p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px;">${property.address}</p>` : ''}
                      ${property.propertyClass ? `<div style="margin-top: 8px;"><span style="background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${property.propertyClass.name}</span></div>` : ''}
                    </div>
                  `,
                  clickable: true
                });
              }
            }
          });
          
          // Small delay between batches to prevent UI blocking
          if (i + batchSize < filteredProperties.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        if (filteredProperties.length > 0) {
          leafletMapService.fitToMarkers(mapId, 50);
        }
        
      } catch (error) {
        console.error('Error updating fullscreen map data:', error);
      }
    };

    updateMapData();
  }, [filteredProperties, mapLoaded, mapId, selectedPropertyState]);

  // Address search functionality
  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await openStreetMapService.searchAddresses(query, {
        countrycodes: 'ru',
        limit: 8,
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

  const handleSelectSearchResult = (result: any) => {
    if (!mapId) return;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    leafletMapService.setView(mapId, [lon, lat], 15);
    leafletMapService.addMarker(mapId, [lon, lat], {
      title: 'Найденный адрес',
      popup: `<div style="padding: 8px;"><strong>Найденный адрес</strong><br/>${openStreetMapService.formatAddress(result)}</div>`
    });

    setSearchQuery('');
    setSearchResults([]);
    
    safePromise(Promise.resolve(trackMapEvent('fullscreen_address_search', { 
      query: result.display_name 
    })));
  };

  // Map controls
  const handleZoomIn = () => {
    if (!mapId) return;
    const currentZoom = leafletMapService.getZoom(mapId);
    if (currentZoom && currentZoom < 18) {
      const center = leafletMapService.getCenter(mapId);
      if (center) {
        leafletMapService.setView(mapId, center, currentZoom + 1);
      }
    }
  };

  const handleZoomOut = () => {
    if (!mapId) return;
    const currentZoom = leafletMapService.getZoom(mapId);
    if (currentZoom && currentZoom > 3) {
      const center = leafletMapService.getCenter(mapId);
      if (center) {
        leafletMapService.setView(mapId, center, currentZoom - 1);
      }
    }
  };

  const handleResetView = () => {
    if (!mapId) return;
    leafletMapService.setView(mapId, [60.6122, 56.8431], 11);
  };

  const handleExportData = () => {
    const dataToExport = {
      properties: filteredProperties.length,
      filters: {
        priceRange,
        rooms: roomsFilter,
        propertyType: propertyTypeFilter
      },
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sreda-market-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    safePromise(Promise.resolve(trackMapEvent('data_export', {
      properties_count: filteredProperties.length
    })));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Maximize2 className="h-5 w-5" />
                <span>Карта недвижимости SREDA Market</span>
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Main content */}
          <div className="flex-1 relative">
            {/* Map container */}
            <div 
              ref={mapContainer} 
              className="w-full h-full"
            />

            {/* Controls overlay */}
            {mapLoaded && (
              <>
                {/* Top left controls */}
                <div className="absolute top-4 left-4 z-10 space-y-2 max-w-xs">
                  {/* Search */}
                  <Card className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Search className="h-4 w-4" />
                      <span className="text-sm font-medium">Поиск адресов</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Введите адрес или район..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearch(e.target.value);
                        }}
                        className="w-full"
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

                  {/* Filters */}
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4" />
                        <span className="text-sm font-medium">Фильтры</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        {showFilters ? 'Скрыть' : 'Показать'}
                      </Button>
                    </div>
                    
                    {showFilters && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium">Цена (₽)</label>
                          <Slider
                            value={priceRange}
                            onValueChange={(value) => setPriceRange(value as [number, number])}
                            min={0}
                            max={10000000}
                            step={100000}
                            className="mt-1"
                          />
                          <div className="text-xs text-gray-600 mt-1">
                            {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium">Комнат</label>
                          <Select value={roomsFilter} onValueChange={setRoomsFilter}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Любое количество</SelectItem>
                              <SelectItem value="1">1 комната</SelectItem>
                              <SelectItem value="2">2 комнаты</SelectItem>
                              <SelectItem value="3">3 комнаты</SelectItem>
                              <SelectItem value="4">4+ комнат</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-medium">Тип недвижимости</label>
                          <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Любой тип</SelectItem>
                              <SelectItem value="apartment">Квартира</SelectItem>
                              <SelectItem value="house">Дом</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Top right controls */}
                <div className="absolute top-4 right-4 z-10 space-y-2">
                  {/* Map controls */}
                  <Card className="p-2">
                    <div className="flex flex-col space-y-1">
                      <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleResetView}>
                        <Navigation className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleExportData}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Bottom left stats */}
                <div className="absolute bottom-4 left-4 z-10">
                  <Card className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm font-medium">Статистика</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div>Показано объектов: {filteredProperties.length} из {properties.length}</div>
                      <div>Источник: OpenStreetMap</div>
                      {mapId && (
                        <>
                          <div>Центр: {leafletMapService.getCenter(mapId)?.map(coord => coord.toFixed(4)).join(', ')}</div>
                          <div>Зум: {leafletMapService.getZoom(mapId)}</div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            )}

            {/* Loading overlay */}
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-600">Загрузка полноэкранной карты...</p>
                  <p className="text-sm text-gray-500 mt-2">Инициализация OpenStreetMap</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}