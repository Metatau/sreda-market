import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Map, 
  Layers, 
  Search, 
  Settings, 
  BarChart3, 
  Zap,
  MapPin,
  Target,
  TrendingUp,
  Building,
  Car,
  ShoppingBag,
  GraduationCap,
  Heart,
  Palette
} from 'lucide-react';
import type { Property, Region } from '@/types';


interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface HeatmapData {
  lat: number;
  lng: number;
  intensity: number;
}

interface InfrastructurePoint {
  id: string;
  type: 'metro' | 'transport' | 'school' | 'hospital' | 'shopping' | 'park' | 'business';
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  distance?: number;
}

interface DistrictAnalysis {
  districtId: string;
  name: string;
  coordinates: { lat: number; lng: number };
  socialScore: number;
  commercialScore: number;
  transportScore: number;
  overallScore: number;
  investmentPotential: 'low' | 'medium' | 'high' | 'excellent';
  priceGrowthForecast: number;
  liquidityScore: number;
  developmentProjects: string[];
}

interface Polygon {
  id: number;
  userId: number;
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface PolygonArea {
  totalProperties: number;
  avgPrice: number;
  avgPricePerSqm: number;
  priceRange: { min: number; max: number };
  propertyTypes: Record<string, number>;
  investmentScore: number;
  infrastructureScore: number;
  transportScore: number;
  developmentPotential: 'low' | 'medium' | 'high' | 'excellent';
  estimatedGrowth: number;
}

interface Props {
  properties: Property[];
  selectedRegion?: Region;
  onPropertySelect?: (property: Property) => void;
}

export function AdvancedPropertyMap({ properties, selectedRegion, onPropertySelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapBounds, setMapBounds] = useState<MapBounds>({
    north: 56.0,
    south: 55.5,
    east: 38.0,
    west: 37.0
  });

  // Map states
  const [heatmapType, setHeatmapType] = useState<'none' | 'properties' | 'social' | 'commercial' | 'transport' | 'combined'>('none');
  const [heatmapIntensity, setHeatmapIntensity] = useState([0.6]);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite' | 'dark' | 'light' | 'terrain'>('standard');
  
  // Performance tracking
  const [performanceData, setPerformanceData] = useState<{
    heatmap?: { cached: boolean; source: string };
    infrastructure?: { cached: boolean; source: string };
  }>({});

  // API queries
  const { data: heatmapData } = useQuery({
    queryKey: ['/api/map/heatmap', heatmapType, mapBounds],
    queryFn: () => {
      if (heatmapType === 'none') return null;
      const params = new URLSearchParams({
        type: heatmapType,
        north: mapBounds.north.toString(),
        south: mapBounds.south.toString(),
        east: mapBounds.east.toString(),
        west: mapBounds.west.toString()
      });
      return fetch(`/api/map/heatmap?${params}`, {
        credentials: 'include'
      }).then(res => res.json()).then(data => {
        // Track performance data
        if (data.success) {
          setPerformanceData(prev => ({
            ...prev,
            heatmap: {
              cached: data.cached || false,
              source: data.source || 'unknown'
            }
          }));
        }
        return data;
      });
    },
    enabled: heatmapType !== 'none'
  });

  const { data: infrastructureData } = useQuery({
    queryKey: ['/api/map/infrastructure', mapBounds],
    queryFn: () => {
      const params = new URLSearchParams({
        north: mapBounds.north.toString(),
        south: mapBounds.south.toString(),
        east: mapBounds.east.toString(),
        west: mapBounds.west.toString()
      });
      return fetch(`/api/map/infrastructure?${params}`, {
        credentials: 'include'
      }).then(res => res.json()).then(data => {
        // Track performance data
        if (data.success) {
          setPerformanceData(prev => ({
            ...prev,
            infrastructure: {
              cached: data.cached || false,
              source: data.source || 'unknown'
            }
          }));
        }
        return data;
      });
    },
    enabled: showInfrastructure
  });

  const { data: districtsAnalysis } = useQuery({
    queryKey: ['/api/map/districts/analysis', selectedRegion?.id],
    queryFn: () => selectedRegion ? 
      fetch(`/api/map/districts/analysis/${selectedRegion.id}`, {
        credentials: 'include'
      }).then(res => res.json()) : 
      null,
    enabled: !!selectedRegion
  });

  const { data: userPolygons } = useQuery({
    queryKey: ['/api/map/polygons'],
    queryFn: () => fetch('/api/map/polygons', {
      credentials: 'include'
    }).then(res => res.json())
  });

  const queryClient = useQueryClient();

  const createPolygonMutation = useMutation({
    mutationFn: (polygonData: {
      name: string;
      coordinates: Array<{ lat: number; lng: number }>;
      color: string;
      description?: string;
    }) => fetch('/api/map/polygons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(polygonData)
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/map/polygons'] });
      setIsDrawingPolygon(false);
      setPolygonPoints([]);
    }
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    // Initialize Leaflet map
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current).setView([55.7558, 37.6176], 11);
    
    // Add initial tile layer
    const getMapTiles = (style: string) => {
      const tileConfigs = {
        standard: {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OpenStreetMap contributors'
        },
        satellite: {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
        },
        dark: {
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
          attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors'
        },
        light: {
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
          attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors'
        },
        terrain: {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: '© OpenTopoMap (CC-BY-SA)'
        }
      };
      return tileConfigs[style as keyof typeof tileConfigs] || tileConfigs.standard;
    };

    const tileConfig = getMapTiles(mapStyle);
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution
    }).addTo(map);
    
    // Store tile layer reference for style changes
    (map as any)._currentTileLayer = tileLayer;

    // Update bounds when map moves
    map.on('moveend', () => {
      const bounds = map.getBounds();
      setMapBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    });

    // Handle polygon drawing
    map.on('click', (e: any) => {
      if (isDrawingPolygon) {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        setPolygonPoints(prev => [...prev, newPoint]);
      }
    });

    setMapInstance(map);

    return () => {
      map.remove();
    };
  }, [mapRef, isDrawingPolygon]);

  // Update map style when changed
  useEffect(() => {
    if (!mapInstance) return;
    
    const L = (window as any).L;
    
    const getMapTiles = (style: string) => {
      const tileConfigs = {
        standard: {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '© OpenStreetMap contributors'
        },
        satellite: {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
        },
        dark: {
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
          attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors'
        },
        light: {
          url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
          attribution: '© Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors'
        },
        terrain: {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: '© OpenTopoMap (CC-BY-SA)'
        }
      };
      return tileConfigs[style as keyof typeof tileConfigs] || tileConfigs.standard;
    };

    // Remove current tile layer
    if ((mapInstance as any)._currentTileLayer) {
      mapInstance.removeLayer((mapInstance as any)._currentTileLayer);
    }

    // Add new tile layer
    const tileConfig = getMapTiles(mapStyle);
    const newTileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution
    }).addTo(mapInstance);
    
    (mapInstance as any)._currentTileLayer = newTileLayer;
    
    console.log(`Map style changed to: ${mapStyle}`);
  }, [mapInstance, mapStyle]);

  // Update map view when region changes
  useEffect(() => {
    if (!mapInstance) return;

    // If no region selected, show all of Russia
    if (!selectedRegion) {
      console.log('Showing all of Russia');
      mapInstance.setView([61.5240, 105.3188], 4); // Center of Russia with zoom level 4
      return;
    }

    // Define region coordinates for all cities (matching exact database region IDs)
    const regionCoordinates: Record<number, { lat: number; lng: number; zoom: number }> = {
      1: { lat: 55.7558, lng: 37.6176, zoom: 11 }, // Москва
      2: { lat: 59.9311, lng: 30.3609, zoom: 11 }, // Санкт-Петербург
      3: { lat: 55.0084, lng: 82.9357, zoom: 11 }, // Новосибирск
      4: { lat: 56.8431, lng: 60.6454, zoom: 11 }, // Екатеринбург
      5: { lat: 55.7887, lng: 49.1221, zoom: 11 }, // Казань
      11: { lat: 54.7388, lng: 55.9721, zoom: 11 }, // Уфа
      12: { lat: 56.0184, lng: 92.8672, zoom: 11 }, // Красноярск
      13: { lat: 58.0105, lng: 56.2502, zoom: 11 }, // Пермь
      35: { lat: 54.7104, lng: 20.4522, zoom: 11 }, // Калининград
      36: { lat: 57.1522, lng: 65.5272, zoom: 11 }, // Тюмень
      37: { lat: 43.6028, lng: 39.7342, zoom: 11 }  // Сочи
    };

    const coords = regionCoordinates[selectedRegion.id];
    if (coords) {
      console.log(`Switching map to ${selectedRegion.name} at ${coords.lat}, ${coords.lng}`);
      mapInstance.setView([coords.lat, coords.lng], coords.zoom);
    }
  }, [mapInstance, selectedRegion]);

  // Add property markers
  useEffect(() => {
    if (!mapInstance || !properties.length) return;

    const L = (window as any).L;
    const markers: any[] = [];

    console.log(`AdvancedPropertyMap: Adding ${properties.length} property markers to map`);

    properties.forEach((property, index) => {
      if (!property.coordinates) return;

      let lat, lng;
      try {
        if (typeof property.coordinates === 'string') {
          // Handle POINT(lng lat) format from database
          if (property.coordinates.startsWith('POINT(')) {
            const pointData = property.coordinates.replace('POINT(', '').replace(')', '');
            const [lngStr, latStr] = pointData.split(' ');
            lng = parseFloat(lngStr);
            lat = parseFloat(latStr);
          } else if (property.coordinates.includes(',')) {
            [lat, lng] = property.coordinates.split(',').map(Number);
          } else {
            const coords = JSON.parse(property.coordinates);
            lat = coords.lat || coords[1];
            lng = coords.lng || coords[0];
          }
        } else {
          lat = property.coordinates?.lat || property.coordinates?.[1];
          lng = property.coordinates?.lng || property.coordinates?.[0];
        }
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          console.warn(`Skipping property ${property.id} - invalid coordinates:`, property.coordinates);
          return;
        }
      } catch (e) {
        console.error('Error parsing coordinates for property:', property.id, property.coordinates);
        return;
      }

      // Create a more visible custom icon
      const customIcon = L.divIcon({
        html: `<div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      const marker = L.marker([lat, lng], { icon: customIcon })
        .bindPopup(`
          <div style="font-family: system-ui; padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">${property.title}</h3>
            <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Цена:</strong> ${property.price?.toLocaleString() || 'Не указана'} ₽</p>
            <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Класс:</strong> ${property.propertyClass?.name || 'Не указан'}</p>
            <p style="margin: 4px 0; font-size: 13px; color: #374151;"><strong>Адрес:</strong> ${property.address || 'Не указан'}</p>
            <button onclick="window.selectPropertyFromMap && window.selectPropertyFromMap(${property.id})" 
                    style="margin-top: 8px; padding: 6px 12px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); 
                           color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%;">
              Подробнее
            </button>
          </div>
        `)
        .addTo(mapInstance);

      marker.on('click', () => {
        setSelectedProperty(property);
        onPropertySelect?.(property);
      });

      markers.push(marker);
      console.log(`Added marker ${index + 1} at [${lat}, ${lng}] for property ${property.id}`);
    });

    // Add global function for popup buttons
    (window as any).selectPropertyFromMap = (propertyId: number) => {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setSelectedProperty(property);
        onPropertySelect?.(property);
      }
    };

    // Fit map to show all markers if we have any
    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      mapInstance.fitBounds(group.getBounds(), { padding: [20, 20] });
      console.log(`Map fitted to ${markers.length} markers`);
    }

    return () => {
      markers.forEach(marker => mapInstance.removeLayer(marker));
      console.log(`Cleaned up ${markers.length} markers`);
    };
  }, [mapInstance, properties, onPropertySelect]);

  // Add heatmap layer
  useEffect(() => {
    if (!mapInstance || !heatmapData?.data) return;

    const L = (window as any).L;
    
    // Remove existing heatmap
    mapInstance.eachLayer((layer: any) => {
      if (layer.options && layer.options.isHeatmap) {
        mapInstance.removeLayer(layer);
      }
    });

    if (heatmapType === 'none') return;

    // Add new heatmap
    const heatPoints = heatmapData.data.map((point: HeatmapData) => [
      point.lat, 
      point.lng, 
      point.intensity * heatmapIntensity[0]
    ]);

    if (L.heatLayer) {
      const heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        isHeatmap: true
      }).addTo(mapInstance);
    }
  }, [mapInstance, heatmapData, heatmapType, heatmapIntensity]);

  // Add infrastructure points
  useEffect(() => {
    if (!mapInstance || !showInfrastructure || !infrastructureData?.data) return;

    const L = (window as any).L;
    const infrastructureMarkers: any[] = [];

    const iconMap = {
      metro: '🚇',
      transport: '🚌',
      school: '🎓',
      hospital: '🏥',
      shopping: '🛍️',
      park: '🌳',
      business: '🏢'
    };

    Object.values(infrastructureData.data).flat().forEach((point: any) => {
      const icon = L.divIcon({
        html: `<div style="font-size: 16px;">${iconMap[point.type as keyof typeof iconMap] || '📍'}</div>`,
        className: 'infrastructure-icon',
        iconSize: [20, 20]
      });

      const marker = L.marker([point.coordinates.lat, point.coordinates.lng], { icon })
        .bindPopup(`
          <div class="p-2">
            <h4 class="font-semibold">${point.name}</h4>
            <p class="text-sm text-gray-600">${point.category}</p>
            ${point.rating ? `<p class="text-xs">Рейтинг: ${point.rating}/10</p>` : ''}
          </div>
        `)
        .addTo(mapInstance);

      infrastructureMarkers.push(marker);
    });

    return () => {
      infrastructureMarkers.forEach(marker => mapInstance.removeLayer(marker));
    };
  }, [mapInstance, showInfrastructure, infrastructureData]);

  // Add polygon drawing
  useEffect(() => {
    if (!mapInstance || !isDrawingPolygon) return;

    const L = (window as any).L;
    let tempMarkers: any[] = [];
    let tempPolyline: any = null;

    // Show current polygon points
    polygonPoints.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng])
        .bindPopup(`Точка ${index + 1}`)
        .addTo(mapInstance);
      tempMarkers.push(marker);
    });

    // Show connecting lines
    if (polygonPoints.length > 1) {
      const latlngs = polygonPoints.map(p => [p.lat, p.lng]);
      tempPolyline = L.polyline(latlngs, { color: 'blue', weight: 2 })
        .addTo(mapInstance);
    }

    return () => {
      tempMarkers.forEach(marker => mapInstance.removeLayer(marker));
      if (tempPolyline) mapInstance.removeLayer(tempPolyline);
    };
  }, [mapInstance, isDrawingPolygon, polygonPoints]);

  const getInvestmentPotentialColor = (potential: string) => {
    switch (potential) {
      case 'excellent': return 'bg-green-500';
      case 'high': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="w-full h-[600px] relative bg-white rounded-lg overflow-hidden border">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Control Panel */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-sm">
        <Tabs defaultValue="heatmap" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="style">
              <Palette className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              <Layers className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="infrastructure">
              <Building className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="polygons">
              <Target className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <BarChart3 className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="style" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Стиль карты</label>
              <Select value={mapStyle} onValueChange={(value: any) => setMapStyle(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Стандартная</SelectItem>
                  <SelectItem value="satellite">Спутниковая</SelectItem>
                  <SelectItem value="dark">Тёмная</SelectItem>
                  <SelectItem value="light">Светлая</SelectItem>
                  <SelectItem value="terrain">Топографическая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'standard', name: 'Стандартная', preview: 'bg-blue-100' },
                { key: 'satellite', name: 'Спутниковая', preview: 'bg-green-800' },
                { key: 'dark', name: 'Тёмная', preview: 'bg-gray-900' },
                { key: 'light', name: 'Светлая', preview: 'bg-gray-50' },
                { key: 'terrain', name: 'Рельеф', preview: 'bg-amber-100' }
              ].map((style) => (
                <button
                  key={style.key}
                  onClick={() => setMapStyle(style.key as any)}
                  className={`p-2 rounded border text-xs text-center transition-all ${
                    mapStyle === style.key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-8 ${style.preview} rounded mb-1`} />
                  {style.name}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Тип тепловой карты</label>
              <Select value={heatmapType} onValueChange={(value: any) => setHeatmapType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не показывать</SelectItem>
                  <SelectItem value="properties">Плотность объектов</SelectItem>
                  <SelectItem value="social">Социальная инфраструктура</SelectItem>
                  <SelectItem value="commercial">Коммерческая инфраструктура</SelectItem>
                  <SelectItem value="transport">Транспортная доступность</SelectItem>
                  <SelectItem value="combined">Общая инфраструктура</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {heatmapType !== 'none' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Интенсивность: {Math.round(heatmapIntensity[0] * 100)}%
                </label>
                <Slider
                  value={heatmapIntensity}
                  onValueChange={setHeatmapIntensity}
                  max={1}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showInfrastructure}
                onChange={(e) => setShowInfrastructure(e.target.checked)}
                className="rounded"
              />
              <label className="text-sm font-medium">Показать инфраструктуру</label>
            </div>

            {showInfrastructure && infrastructureData?.data && (
              <div className="space-y-2">
                <div className="text-xs text-gray-600">
                  🚇 Метро • 🚌 Транспорт • 🎓 Образование
                </div>
                <div className="text-xs text-gray-600">
                  🏥 Медицина • 🛍️ Торговля • 🌳 Парки
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="polygons" className="space-y-4">
            <div className="space-y-2">
              <Button
                variant={isDrawingPolygon ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  setIsDrawingPolygon(!isDrawingPolygon);
                  if (isDrawingPolygon) {
                    setPolygonPoints([]);
                  }
                }}
                className="w-full"
              >
                {isDrawingPolygon ? 'Отменить рисование' : 'Нарисовать область'}
              </Button>

              {isDrawingPolygon && polygonPoints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    Точек: {polygonPoints.length}
                  </p>
                  
                  {polygonPoints.length >= 3 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full">
                          Завершить полигон
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Сохранить область</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input placeholder="Название области" />
                          <Input placeholder="Описание (опционально)" />
                          <div className="flex items-center space-x-2">
                            <Palette className="w-4 h-4" />
                            <input
                              type="color"
                              defaultValue="#3B82F6"
                              className="w-12 h-8 border rounded"
                            />
                          </div>
                          <Button 
                            onClick={() => {
                              createPolygonMutation.mutate({
                                name: 'Новая область',
                                coordinates: polygonPoints,
                                color: '#3B82F6'
                              });
                            }}
                            className="w-full"
                          >
                            Сохранить
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </div>

            {userPolygons?.data && userPolygons.data.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Сохраненные области</h4>
                {userPolygons.data.map((polygon: Polygon) => (
                  <div key={polygon.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                    <span>{polygon.name}</span>
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: polygon.color }}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {districtsAnalysis?.data && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <h4 className="text-sm font-medium">Анализ районов</h4>
                {districtsAnalysis.data.slice(0, 5).map((district: DistrictAnalysis) => (
                  <Card key={district.districtId} className="p-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-medium">{district.name}</h5>
                        <Badge 
                          className={`text-xs ${getInvestmentPotentialColor(district.investmentPotential)}`}
                        >
                          {district.investmentPotential}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div className="text-center">
                          <div className="text-gray-600">Социальная</div>
                          <div className="font-medium">{Math.round(district.socialScore)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600">Транспорт</div>
                          <div className="font-medium">{Math.round(district.transportScore)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600">Рост</div>
                          <div className="font-medium text-green-600">
                            +{district.priceGrowthForecast.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Property Details Modal */}
      {selectedProperty && (
        <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedProperty.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Цена</label>
                  <div className="font-semibold">{formatPrice(selectedProperty.price)}</div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Класс</label>
                  <div className="font-semibold">{selectedProperty.propertyClass?.name}</div>
                </div>
              </div>

              {selectedProperty.analytics && (
                <div className="space-y-2">
                  <h4 className="font-medium">Инвестиционная привлекательность</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">ROI:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {selectedProperty.analytics.rentalYield || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ликвидность:</span>
                      <span className="ml-2 font-medium">
                        {selectedProperty.analytics.liquidityScore || 'N/A'}/10
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={() => onPropertySelect?.(selectedProperty)}
                className="w-full"
              >
                Подробнее об объекте
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}


    </div>
  );
}