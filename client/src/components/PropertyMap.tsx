
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useProperties } from '@/hooks/useProperties';
import type { Property } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Layers, Navigation } from 'lucide-react';
import { openStreetMapService } from '@/services/openStreetMapService';
import { leafletMapService } from '@/services/leafletMapService';
import { safePromise } from '@/lib/errorHandling';

interface PropertyMapProps {
  filters?: {
    regionId?: number;
    propertyClassId?: number;
  };
  onPropertySelect?: (property: Property) => void;
}

export function PropertyMap({ filters, onPropertySelect }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  const { data: properties, isLoading } = useProperties(filters);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapId) {
      const initMap = async () => {
        const [newMapId] = await safePromise(
          leafletMapService.createMap(mapRef.current!, {
            center: [55.7558, 37.6176], // Moscow center
            zoom: 10,
            useOSM: true // Force OSM tiles
          })
        );
        
        if (newMapId) {
          setMapId(newMapId);
          console.log('OSM Map initialized with ID:', newMapId);
        }
      };
      
      initMap();
    }
  }, [mapId]);

  // Add property markers when properties load
  useEffect(() => {
    if (mapId && properties?.length > 0) {
      const addMarkers = async () => {
        const validProperties = properties.filter(property => {
          if (!property.coordinates) return false;
          
          let coords;
          try {
            if (typeof property.coordinates === 'string') {
              if (property.coordinates.startsWith('POINT(')) {
                // Parse PostGIS format
                const match = property.coordinates.match(/POINT\(([^)]+)\)/);
                if (match) {
                  const [lng, lat] = match[1].split(' ').map(Number);
                  coords = { lat, lng };
                }
              } else {
                // Parse JSON format
                coords = JSON.parse(property.coordinates);
              }
            } else {
              coords = property.coordinates;
            }
          } catch (error) {
            console.warn(`Invalid coordinates for property ${property.id}:`, property.coordinates);
            return false;
          }
          
          return coords && !isNaN(coords.lat) && !isNaN(coords.lng);
        });

        const markers = validProperties.map(property => {
          let coords;
          if (typeof property.coordinates === 'string') {
            if (property.coordinates.startsWith('POINT(')) {
              const match = property.coordinates.match(/POINT\(([^)]+)\)/);
              if (match) {
                const [lng, lat] = match[1].split(' ').map(Number);
                coords = [lat, lng];
              }
            } else {
              const parsed = JSON.parse(property.coordinates);
              coords = [parsed.lat, parsed.lng];
            }
          } else {
            coords = [property.coordinates.lat, property.coordinates.lng];
          }

          return {
            id: property.id,
            coordinates: coords,
            popup: {
              ...property,
              popup: {
                title: property.title,
                description: property.description?.substring(0, 200) + '...',
                price: property.price,
                area: property.area,
                propertyClass: property.propertyClass?.name || 'Не указан'
              }
            }
          };
        });

        console.log('PropertyMap: Processing', markers.length, 'valid markers from', properties.length, 'properties');
        
        if (markers.length > 0) {
          console.log('PropertyMap: Sample marker:', markers[0]);
          const [success] = await safePromise(
            leafletMapService.addPropertyMarkers(mapId, markers)
          );
          
          if (success) {
            console.log('Successfully added', markers.length, 'property markers to map');
          }
        }
      };

      addMarkers();
    }
  }, [mapId, properties]);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const [results] = await safePromise(
      openStreetMapService.searchAddresses(query, {
        region: 'russia',
        limit: 5
      })
    );

    if (results) {
      setSearchResults(results);
    }
    setIsSearching(false);
  }, []);

  const handleSearchResultSelect = useCallback(async (result: any) => {
    if (!mapId) return;

    const [success] = await safePromise(
      leafletMapService.flyToLocation(mapId, {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      }, 16)
    );

    if (success) {
      setSearchResults([]);
      setSearchQuery('');
    }
  }, [mapId]);

  const toggleHeatmap = useCallback(async () => {
    if (!mapId) return;
    
    const newHeatmapState = !showHeatmap;
    const [success] = await safePromise(
      leafletMapService.toggleHeatmap(mapId, newHeatmapState)
    );
    
    if (success) {
      setShowHeatmap(newHeatmapState);
    }
  }, [mapId, showHeatmap]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Загрузка карты...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {/* Search */}
          <div className="relative">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Поиск адреса..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="w-64 bg-white/90 backdrop-blur-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="bg-white/90 backdrop-blur-sm"
                disabled={isSearching}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-white rounded-md shadow-lg border max-h-48 overflow-y-auto z-20">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchResultSelect(result)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                  >
                    <div className="font-medium text-sm">{result.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Controls */}
          <div className="flex gap-2">
            <Button
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              onClick={toggleHeatmap}
              className="bg-white/90 backdrop-blur-sm"
            >
              <Layers className="h-4 w-4 mr-1" />
              {showHeatmap ? 'Скрыть тепловую карту' : 'Тепловая карта'}
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="absolute top-4 right-4 z-10">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {properties?.length || 0} объектов
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Container */}
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-md"
          style={{ minHeight: '400px' }}
        />

        {/* Property Info Panel */}
        {selectedProperty && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      {selectedProperty.title}
                    </h3>
                    <div className="flex gap-4 mb-2">
                      <Badge variant="secondary">
                        {selectedProperty.propertyClass?.name || 'Не указан'}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {selectedProperty.area} м²
                      </span>
                    </div>
                    <p className="text-xl font-bold text-green-600">
                      {selectedProperty.price?.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onPropertySelect?.(selectedProperty)}
                    >
                      Подробнее
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProperty(null)}
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && (!properties || properties.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Объекты недвижимости не найдены</p>
              <p className="text-sm text-gray-400">Попробуйте изменить фильтры поиска</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
