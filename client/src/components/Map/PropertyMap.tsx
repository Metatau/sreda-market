import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Property } from '@/types';

// Используем глобальный объект mapboxgl из CDN
declare global {
  interface Window {
    mapboxgl: any;
  }
}

interface PropertyMapProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect?: (property: Property) => void;
}

type HeatmapMode = 'none' | 'density' | 'price' | 'investment';

const getPropertyClassColor = (className: string) => {
  const colors: Record<string, string> = {
    'Эконом': 'bg-blue-500',
    'Стандарт': 'bg-green-500',
    'Комфорт': 'bg-yellow-500',
    'Бизнес': 'bg-orange-500',
    'Элит': 'bg-red-500',
  };
  return colors[className] || 'bg-gray-500';
};

export function PropertyMap({ properties, selectedProperty, onPropertySelect }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('none');
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(1);
  const [selectedPropertyState, setSelectedProperty] = useState<Property | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!mapboxToken || !window.mapboxgl) {
      console.warn('Mapbox access token not configured or Mapbox GL JS not loaded');
      setMapLoaded(true);
      return;
    }

    window.mapboxgl.accessToken = mapboxToken;

    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [60.6122, 56.8431], // Екатеринбург
      zoom: 11,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add property layers with clustering support
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers and sources
    const layersToRemove = ['property-clusters', 'property-count', 'unclustered-point', 'heatmap-layer', 'heatmap-circle'];
    layersToRemove.forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });

    const sourcesToRemove = ['properties', 'heatmap-data'];
    sourcesToRemove.forEach(sourceId => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.property-marker');
    existingMarkers.forEach(marker => marker.remove());

    if (!properties?.length) return;

    // Create GeoJSON data
    const geojsonData = {
      type: 'FeatureCollection',
      features: properties.map(property => {
        if (!property.coordinates) return null;
        
        const coords = property.coordinates.split(',').map(Number);
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return null;

        let value = 1;
        switch (heatmapMode) {
          case 'price':
            value = property.price || 0;
            break;
          case 'investment':
            value = property.investmentAnalytics?.roi ? parseFloat(property.investmentAnalytics.roi) : 0;
            break;
          case 'density':
          default:
            value = 1;
            break;
        }

        return {
          type: 'Feature',
          properties: { 
            value,
            id: property.id,
            title: property.title,
            price: property.price,
            rooms: property.rooms,
            area: property.totalArea
          },
          geometry: {
            type: 'Point',
            coordinates: [coords[1], coords[0]]
          }
        };
      }).filter(Boolean)
    };

    if (heatmapMode === 'none') {
      // Add clustered source for normal view
      map.current!.addSource('properties', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster circles
      map.current!.addLayer({
        id: 'property-clusters',
        type: 'circle',
        source: 'properties',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100, '#f1f075',
            750, '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, 100, 30, 750, 40
          ]
        }
      });

      // Add cluster count labels
      map.current!.addLayer({
        id: 'property-count',
        type: 'symbol',
        source: 'properties',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      // Add unclustered points
      map.current!.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 8,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      });

      // Add click handlers
      map.current!.on('click', 'property-clusters', (e: any) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ['property-clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.current!.getSource('properties').getClusterExpansionZoom(
          clusterId,
          (err: any, zoom: number) => {
            if (err) return;
            map.current!.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        );
      });

      map.current!.on('click', 'unclustered-point', (e: any) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const clickedPropertyId = e.features[0].properties.id;
        
        // Find the property by ID and trigger selection
        const property = properties.find((p: Property) => p.id === clickedPropertyId);
        if (property) {
          setSelectedProperty(property);
          onPropertySelect?.(property);
        }
      });
    }
  }, [properties, mapLoaded, heatmapMode, onPropertySelect]);

  // Add heatmap layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !properties?.length || heatmapMode === 'none') return;

    // Remove existing heatmap layers
    const layersToRemove = ['heatmap-layer', 'heatmap-circle'];
    layersToRemove.forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });

    if (map.current!.getSource('properties-heatmap')) {
      map.current!.removeSource('properties-heatmap');
    }

    // Prepare heatmap data
    const heatmapData: any = {
      type: 'FeatureCollection',
      features: properties.map(property => {
        let weight = 1;
        if (heatmapMode === 'price') {
          weight = (property.pricePerSqm || property.price) / 100000; // Normalize price
        } else if (heatmapMode === 'investment') {
          weight = property.investmentRating || Math.random() * 10; // Use investment rating
        }
        
        if (!property.coordinates) return null;
        const coords = property.coordinates.split(',').map(Number);
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return null;
        
        return {
          type: 'Feature',
          properties: { weight },
          geometry: {
            type: 'Point',
            coordinates: [coords[1], coords[0]] // [lng, lat] for Mapbox
          }
        };
      }).filter(Boolean)
    };

    // Add heatmap source
    map.current!.addSource('properties-heatmap', {
      type: 'geojson',
      data: heatmapData
    });

    // Add heatmap layer
    map.current!.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'properties-heatmap',
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['get', 'weight'],
        'heatmap-intensity': heatmapIntensity,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0
        ]
      }
    });

    // Add circle layer for higher zoom levels
    map.current!.addLayer({
      id: 'heatmap-circle',
      type: 'circle',
      source: 'properties-heatmap',
      minzoom: 14,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, ['interpolate', ['linear'], ['get', 'weight'], 1, 1, 6, 4],
          16, ['interpolate', ['linear'], ['get', 'weight'], 1, 5, 6, 50]
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'weight'],
          1, 'rgba(33,102,172,0.8)',
          2, 'rgba(103,169,207,0.8)',
          3, 'rgba(209,229,240,0.8)',
          4, 'rgba(253,219,199,0.8)',
          5, 'rgba(239,138,98,0.8)',
          6, 'rgba(178,24,43,0.8)'
        ],
        'circle-stroke-color': 'white',
        'circle-stroke-width': 1,
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0,
          15, 1
        ]
      }
    });

  }, [mapLoaded, heatmapMode, heatmapIntensity, properties]);

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Heatmap Controls */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 rounded-lg shadow-lg p-4 border">
          <div className="space-y-3">
            {/* Heatmap Type Selection */}
            <div className="space-y-2">
              <div className="flex gap-1">
                <Button
                  variant={heatmapMode === 'none' ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => setHeatmapMode('none')}
                >
                  Объекты
                </Button>
                <Button
                  variant={heatmapMode === 'density' ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => setHeatmapMode('density')}
                >
                  Плотность
                </Button>
                <Button
                  variant={heatmapMode === 'price' ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => setHeatmapMode('price')}
                >
                  Цены
                </Button>
                <Button
                  variant={heatmapMode === 'investment' ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => setHeatmapMode('investment')}
                >
                  Инвестиции
                </Button>
              </div>
            </div>

            {/* Intensity Control */}
            {heatmapMode !== 'none' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">
                  Интенсивность: {Math.round(heatmapIntensity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={heatmapIntensity}
                  onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Heatmap Legend */}
            {heatmapMode !== 'none' && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-2">
                  {heatmapMode === 'density' && 'Плотность объектов'}
                  {heatmapMode === 'price' && 'Уровень цен (₽)'}
                  {heatmapMode === 'investment' && 'Инвестиционный потенциал'}
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">Низкий</span>
                  <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-blue-300 via-yellow-300 to-red-500"></div>
                  <span className="text-xs text-gray-500">Высокий</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        {!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ? (
          <div className="h-96 w-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
            <div className="text-center p-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Карта недоступна</h3>
              <p className="text-sm text-gray-500 mb-4">
                Для отображения карты необходим токен доступа Mapbox
              </p>
              <div className="text-xs text-gray-400">
                Объекты отображаются в списке ниже
              </div>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="h-96 w-full" />
        )}

        {/* Property Info Popup */}
        {selectedPropertyState && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <Card className="max-w-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{selectedPropertyState.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProperty(null)}
                  >
                    <i className="fas fa-times"></i>
                  </Button>
                </div>
                
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Цена:</span>
                    <span className="font-semibold">{selectedPropertyState.price?.toLocaleString()} ₽</span>
                  </div>
                  
                  {selectedPropertyState.pricePerSqm && (
                    <div className="flex items-center justify-between">
                      <span>За м²:</span>
                      <span className="font-semibold">{selectedPropertyState.pricePerSqm.toLocaleString()} ₽</span>
                    </div>
                  )}
                  
                  {selectedPropertyState.rooms && (
                    <div className="flex items-center justify-between">
                      <span>Комнат:</span>
                      <span className="font-semibold">{selectedPropertyState.rooms}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 pt-1 border-t">
                    {selectedPropertyState.address}
                  </div>
                  
                  {selectedPropertyState.propertyClass && (
                    <div className="pt-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedPropertyState.propertyClass.name}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => onPropertySelect?.(selectedPropertyState)}
                >
                  Подробнее
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
}