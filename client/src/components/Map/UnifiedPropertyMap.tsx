import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { leafletMapService } from '@/services/leafletMapService';
import { useMapData } from './hooks/useMapData';
import { useMapControls } from './hooks/useMapControls';
import { useMapLayers } from './hooks/useMapLayers';
import { MapControls } from './controls/MapControls';
import { LayerControls } from './controls/LayerControls';
import type { PropertyWithRelations, PropertyFilters } from '@/types';
import { MapPin, Layers, BarChart3, TrendingUp } from 'lucide-react';

interface UnifiedPropertyMapProps {
  properties: PropertyWithRelations[];
  filters: PropertyFilters;
  onPropertySelect?: (property: PropertyWithRelations) => void;
  mode?: 'basic' | 'analytics' | 'interactive';
  showControls?: boolean;
  showLayers?: boolean;
  height?: string;
  className?: string;
}

export function UnifiedPropertyMap({
  properties = [],
  filters,
  onPropertySelect,
  mode = 'basic',
  showControls = true,
  showLayers = true,
  height = '500px',
  className = ''
}: UnifiedPropertyMapProps) {
  const [mapId, setMapId] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  // Custom hooks for map functionality
  const { mapData, isLoading: isDataLoading } = useMapData(properties, mode);
  const { 
    viewType, 
    setViewType, 
    zoomLevel, 
    setZoomLevel,
    centerCoordinates,
    setCenterCoordinates 
  } = useMapControls();
  const { 
    activeLayer, 
    setActiveLayer, 
    layerOpacity, 
    setLayerOpacity,
    availableLayers 
  } = useMapLayers(mode);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      try {
        await leafletMapService.loadLeaflet();
        const newMapId = `unified_map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const success = leafletMapService.createMap(
          newMapId,
          'map-container',
          centerCoordinates,
          zoomLevel
        );

        if (success) {
          setMapId(newMapId);
          setIsMapLoaded(true);
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

  // Update map markers when properties change
  useEffect(() => {
    if (!mapId || !isMapLoaded || !mapData.length) return;

    const markers = mapData.map(property => ({
      id: property.id,
      coordinates: property.coordinates as [number, number],
      popup: {
        id: property.id,
        title: property.title,
        price: property.price,
        address: property.address,
        area: property.area,
        rooms: property.rooms
      },
      className: property.propertyClass?.name || 'default',
      price: property.price
    }));

    leafletMapService.addPropertyMarkers(mapId, markers, {
      onMarkerClick: handlePropertyClick
    });

    // Fit map to show all markers
    if (markers.length > 0) {
      leafletMapService.fitToMarkers(mapId);
    }
  }, [mapId, isMapLoaded, mapData]);

  // Update heatmap based on active layer
  useEffect(() => {
    if (!mapId || !isMapLoaded || activeLayer === 'none') return;

    const heatmapData = mapData
      .filter(property => property.coordinates)
      .map(property => {
        const [lat, lng] = property.coordinates!.split(',').map(Number);
        let intensity = 0.5;

        switch (activeLayer) {
          case 'price':
            intensity = Math.min(property.price / 20000000, 1); // Normalize price
            break;
          case 'investment':
            intensity = property.investmentAnalytics?.roi ? 
              Math.min(property.investmentAnalytics.roi / 20, 1) : 0.3;
            break;
          case 'density':
            intensity = 0.7; // Static for now, could be calculated based on nearby properties
            break;
        }

        return { lat, lng, intensity };
      });

    if (heatmapData.length > 0) {
      leafletMapService.addHeatmap(mapId, heatmapData, {
        mode: activeLayer,
        radius: 500
      });
    }
  }, [mapId, isMapLoaded, activeLayer, mapData]);

  const handlePropertyClick = useCallback((propertyData: any) => {
    const property = properties.find(p => p.id === propertyData.id);
    if (property) {
      setSelectedPropertyId(property.id);
      onPropertySelect?.(property);
      
      // Highlight selected property on map
      if (mapId && property.coordinates) {
        const [lat, lng] = property.coordinates.split(',').map(Number);
        leafletMapService.highlightMarker(mapId, property.id, { lat, lng });
      }
    }
  }, [mapId, properties, onPropertySelect]);

  const handleViewChange = useCallback((newView: string) => {
    setViewType(newView);
    if (mapId) {
      leafletMapService.setView(mapId, centerCoordinates, zoomLevel);
    }
  }, [mapId, centerCoordinates, zoomLevel]);

  const handleLayerChange = useCallback((layer: string) => {
    if (mapId) {
      leafletMapService.removeHeatmap(mapId);
    }
    setActiveLayer(layer);
  }, [mapId]);

  const statisticsData = useMemo(() => {
    if (!properties.length) return null;

    const totalProperties = properties.length;
    const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / totalProperties;
    const priceRange = {
      min: Math.min(...properties.map(p => p.price)),
      max: Math.max(...properties.map(p => p.price))
    };

    return {
      total: totalProperties,
      avgPrice: Math.round(avgPrice),
      priceRange
    };
  }, [properties]);

  if (isDataLoading) {
    return (
      <Card className={`${className}`} style={{ height }}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`} style={{ height }}>
      <CardContent className="p-0 relative h-full">
        {/* Map Controls */}
        {showControls && mode !== 'basic' && (
          <MapControls
            viewType={viewType}
            onViewChange={handleViewChange}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
            className="absolute top-4 left-4 z-10"
          />
        )}

        {/* Layer Controls */}
        {showLayers && mode === 'analytics' && (
          <LayerControls
            activeLayer={activeLayer}
            onLayerChange={handleLayerChange}
            opacity={layerOpacity}
            onOpacityChange={setLayerOpacity}
            availableLayers={availableLayers}
            className="absolute top-4 right-4 z-10"
          />
        )}

        {/* Statistics Panel */}
        {mode === 'analytics' && statisticsData && (
          <div className="absolute bottom-4 left-4 z-10">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Статистика</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Объектов:</span>
                    <Badge variant="secondary" className="text-xs">
                      {statisticsData.total}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Средняя цена:</span>
                    <span className="font-medium">
                      {statisticsData.avgPrice.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Selected Property Info */}
        {selectedPropertyId && mode === 'interactive' && (
          <div className="absolute bottom-4 right-4 z-10 max-w-xs">
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardContent className="p-3">
                {(() => {
                  const property = properties.find(p => p.id === selectedPropertyId);
                  if (!property) return null;
                  
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Выбранный объект</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="font-medium text-sm truncate">
                          {property.title}
                        </div>
                        <div className="flex justify-between">
                          <span>Цена:</span>
                          <span className="font-medium text-primary">
                            {property.price.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        {property.area && (
                          <div className="flex justify-between">
                            <span>Площадь:</span>
                            <span>{property.area}</span>
                          </div>
                        )}
                        {property.rooms && (
                          <div className="flex justify-between">
                            <span>Комнат:</span>
                            <span>{property.rooms}</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => setSelectedPropertyId(null)}
                      >
                        Закрыть
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Map Container */}
        <div 
          id="map-container" 
          className="w-full h-full rounded-lg"
        />
      </CardContent>
    </Card>
  );
}

export default UnifiedPropertyMap;