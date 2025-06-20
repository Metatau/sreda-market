import React, { useEffect, useRef, useState } from 'react';
import type { Property } from '@/types';
import { leafletMapService } from '@/services/leafletMapService';
import { geolocationService } from '@/services/geolocationService';
import { QuarterAnalyticsPopup } from './components/QuarterAnalyticsPopup';
import { openStreetMapService } from '@/services/openStreetMapService';

// Расширяем интерфейс Window для глобальной функции
declare global {
  interface Window {
    openPropertyModal?: (propertyId: number) => void;
  }
}

// Utility function to correctly parse coordinates from POINT format
const parseCoordinates = (coordinates: string): { lat: number; lng: number } | null => {
  if (coordinates.startsWith('POINT(')) {
    const coords = coordinates.match(/POINT\(([^)]+)\)/)?.[1];
    if (coords) {
      const [longitude, latitude] = coords.split(' ').map(Number);
      // В POINT(longitude latitude) первое значение - долгота, второе - широта
      // Возвращаем правильно: lat = latitude, lng = longitude
      return { lat: latitude, lng: longitude };
    }
  } else {
    // JSON format: [latitude, longitude]
    try {
      const [latitude, longitude] = JSON.parse(coordinates);
      return { lat: latitude, lng: longitude };
    } catch (e) {
      console.warn('Failed to parse coordinates:', coordinates);
    }
  }
  return null;
};

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

const getMarkerColor = (className: string): string => {
  const colors: Record<string, string> = {
    'Эконом': '#3b82f6',     // Blue
    'Комфорт': '#eab308',    // Yellow
    'Бизнес': '#f97316',     // Orange  
    'Элит': '#ef4444',       // Red
    'unknown': '#6b7280'     // Gray
  };
  return colors[className] || '#ef4444'; // Default to red
};

export function PropertyMap({ properties, selectedProperty, onPropertySelect, regionId, activeMapTool = 'none' }: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('none');
  const [analyticsPosition, setAnalyticsPosition] = useState<[number, number] | null>(null);
  const [analyticsAddress, setAnalyticsAddress] = useState<string | null>(null);

  // Создаем глобальную функцию для открытия модального окна из popup
  useEffect(() => {
    (window as any).openPropertyModal = (propertyId: number) => {
      const property = properties.find(p => p.id === propertyId);
      if (property && onPropertySelect) {
        onPropertySelect(property);
      }
    };

    return () => {
      delete (window as any).openPropertyModal;
    };
  }, [properties, onPropertySelect]);

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapContainer.current) return;

      try {
        // Determine initial center and zoom
        let center: [number, number] = [61.524, 105.318]; // Russia center
        let zoom = 4;

        if (regionId && regionId !== 0) {
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
              zoom = 10;
            }
          } catch (error) {
            console.warn('Could not get user location, using default center');
          }
        }

        const newMapId = await leafletMapService.createMap(
          mapContainer.current,
          { center, zoom }
        );

        if (newMapId) {
          setMapId(newMapId);
          setMapLoaded(true);
          console.log('Map initialized with ID:', newMapId);
          
          // Проверяем, что карта действительно загружена
          const mapInstance = leafletMapService.getMap(newMapId);
          console.log('Map instance check:', mapInstance ? 'Found' : 'Not found');
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    return () => {
      if (mapId) {
        leafletMapService.destroyMap(mapId);
      }
    };
  }, []);

  // Handle region changes
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    const handleRegionChange = async () => {
      try {
        if (regionId && regionId !== 0) {
          const regionCoordinates = geolocationService.getRegionCoordinates(regionId);
          if (regionCoordinates) {
            await leafletMapService.setView(mapId, regionCoordinates, 12);
            console.log('Map recentered for region', regionId);
          }
        } else {
          // Show all of Russia
          await leafletMapService.setView(mapId, [61.524, 105.318], 4);
        }
      } catch (error) {
        console.error('Error handling region change:', error);
      }
    };

    handleRegionChange();
  }, [regionId, mapId, mapLoaded]);

  // Handle properties changes
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    console.log('PropertyMap: mapId:', mapId, 'mapLoaded:', mapLoaded, 'properties count:', properties.length);

    const addPropertyMarkers = async () => {
      try {
        // Clear existing markers
        await leafletMapService.clearMarkers(mapId);

        if (properties.length === 0) {
          console.log('No properties to display on map');
          return;
        }

        // Process properties and create markers
        const propertyMarkers = properties
          .filter(p => p.coordinates && p.coordinates.trim() !== '')
          .map(property => {
            try {
              // Parse coordinates using utility function
              const coords = parseCoordinates(property.coordinates!);
              if (!coords) {
                console.warn(`Invalid coordinate format for property ${property.id}:`, property.coordinates);
                return null;
              }

              const { lat, lng } = coords;

              // Validate coordinates are within reasonable bounds
              if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn(`Coordinates out of bounds for property ${property.id}: lat=${lat}, lng=${lng}`);
                return null;
              }

              console.log(`Processing property ${property.id} with coordinates: lat=${lat}, lng=${lng} from raw: ${property.coordinates}`);

              // Add slight offset for properties with same coordinates
              const sameCoordProperties = properties.filter(p => {
                const otherCoords = parseCoordinates(p.coordinates || '');
                return otherCoords && 
                       Math.abs(otherCoords.lat - lat) < 0.0001 && 
                       Math.abs(otherCoords.lng - lng) < 0.0001;
              });

              console.log(`Property ${property.id}: Found ${sameCoordProperties.length - 1} properties with same coordinates`);

              const index = sameCoordProperties.findIndex(p => p.id === property.id);
              const offsetLat = lat + (index * 0.0002);
              const offsetLng = lng + (index * 0.0002);

              // Calculate marker size based on price
              const minPrice = Math.min(...properties.map(p => p.price || 0));
              const maxPrice = Math.max(...properties.map(p => p.price || 0));
              const priceRange = maxPrice - minPrice || 1;
              const normalizedPrice = ((property.price || 0) - minPrice) / priceRange;
              const markerSize = 40 + (normalizedPrice * 20); // 40-60px range

              return {
                id: property.id,
                coordinates: [offsetLat, offsetLng] as [number, number],
                popup: {
                  ...property,
                  priceFormatted: property.price ? `${(property.price / 1000000).toFixed(1)} млн ₽` : 'Цена не указана'
                },
                size: Math.max(40, Math.min(80, markerSize)) // Ensure size is between 40-80px
              };
            } catch (error) {
              console.error(`Error processing property ${property.id}:`, error);
              return null;
            }
          })
          .filter(Boolean);

        console.log('PropertyMap: Processing', propertyMarkers.length, 'valid markers from', properties.length, 'properties');

        if (propertyMarkers.length > 0) {
          console.log('PropertyMap: Sample marker:', propertyMarkers[0]);
        }

        // Add markers to map
        console.log('addPropertyMarkers called with mapId:', mapId, 'properties count:', propertyMarkers.length);

        for (const marker of propertyMarkers) {
          if (marker) {
            console.log(`Creating marker for property ${marker.id} at coordinates:`, marker.coordinates);
            
            // Проверяем валидность координат перед добавлением маркера
            const [lat, lng] = marker.coordinates;
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
              console.error(`Invalid coordinates for marker ${marker.id}: [${lat}, ${lng}]`);
              continue;
            }

            try {
              // Определяем класс недвижимости по ID
              const propertyClassMap: Record<number, string> = {
                1: 'Эконом',
                2: 'Комфорт', 
                3: 'Бизнес',
                4: 'Элит'
              };
              const propertyClass = propertyClassMap[marker.popup.propertyClassId || 0] || 'unknown';
              const markerColor = getMarkerColor(propertyClass);
              const markerSize = Math.max(40, Math.min(80, marker.size)); // Размер между 40-80px
              
              // Проверяем доступность Leaflet
              if (!window.L) {
                console.error('Leaflet not loaded');
                continue;
              }
              
              const customIcon = window.L.divIcon({
                className: 'custom-property-marker',
                html: `
                  <div style="
                    width: ${markerSize}px; 
                    height: ${markerSize}px; 
                    background-color: ${markerColor}; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    font-weight: bold;
                    font-size: 12px;
                    color: white;
                    position: relative;
                  ">
                    ${Math.round((marker.popup.price || 0) / 1000000)}М
                  </div>
                `,
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize/2, markerSize/2]
              });

              const markerResult = await leafletMapService.addMarker(
                mapId,
                marker.coordinates,
                {
                  popup: `
                    <div class="property-popup">
                      <h3 class="font-bold text-sm mb-2">${marker.popup.title}</h3>
                      <p class="text-lg font-bold text-blue-600 mb-1">${marker.popup.priceFormatted}</p>
                      <p class="text-sm text-gray-600 mb-2">${marker.popup.address}</p>
                      <p class="text-xs text-gray-500 mb-3">ID: ${marker.popup.id}</p>
                      <button 
                        onclick="window.openPropertyModal(${marker.popup.id})" 
                        class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
                      >
                        Подробнее
                      </button>
                    </div>
                  `,
                  clickable: true,
                  icon: customIcon
                }
              );
              
              console.log(`Marker ${marker.id} added successfully. Result:`, markerResult);
              console.log(`Marker ${marker.id} added to map. Total markers: ${propertyMarkers.indexOf(marker) + 1}`);
            } catch (error) {
              console.error(`Failed to add marker ${marker.id}:`, error);
            }
          }
        }

        console.log('Successfully added', propertyMarkers.length, 'property markers to map');

        // Auto-fit map to show all markers
        if (propertyMarkers.length > 0) {
          if (regionId && regionId !== 0) {
            // For specific region, focus on that region's properties
            const regionProperties = propertyMarkers.filter(m => m !== null);
            if (regionProperties.length > 0) {
              const avgLat = regionProperties.reduce((sum, m) => sum + m!.coordinates[0], 0) / regionProperties.length;
              const avgLng = regionProperties.reduce((sum, m) => sum + m!.coordinates[1], 0) / regionProperties.length;
              await leafletMapService.setView(mapId, [avgLat, avgLng], 12);
              console.log(`Focused map on region ${regionId} with ${regionProperties.length} properties at [${avgLat}, ${avgLng}]`);
            }
          } else {
            // For "All Cities", fit to show all markers
            leafletMapService.fitToMarkers(mapId, 20);
            console.log('Map fitted to show all markers (all cities mode)');
            
            // Adjust zoom for Russia-wide view
            const currentZoom = leafletMapService.getZoom(mapId);
            if (currentZoom && currentZoom > 4) {
              leafletMapService.setView(mapId, [61.524, 105.318], 3);
              console.log(`Adjusted zoom from ${currentZoom} to 3 for Russia-wide view`);
            }
          }
        }

      } catch (error) {
        console.error('Error adding property markers:', error);
      }
    };

    addPropertyMarkers();
  }, [properties, mapId, mapLoaded, regionId, onPropertySelect]);

  // Handle active map tool changes and add click handlers
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    console.log('Active map tool changed:', activeMapTool);

    const handleMapToolChange = async () => {
      try {
        // Clear all map layers first
        console.log('Clearing all map layers');
        leafletMapService.clearLayers(mapId);

        // Apply new tool
        switch (activeMapTool) {
          case 'heatmap':
            if (properties.length > 0) {
              const heatmapData = properties
                .filter(p => p.coordinates)
                .map(p => {
                  const coords = parseCoordinates(p.coordinates!);
                  return coords ? {
                    lat: coords.lat,
                    lng: coords.lng,
                    intensity: (p.price || 0) / 1000000 // Normalize price to millions
                  } : null;
                })
                .filter(Boolean) as Array<{lat: number; lng: number; intensity: number}>;

              if (heatmapData.length > 0) {
                await leafletMapService.addHeatmap(mapId, heatmapData);
                console.log('Heatmap added with', heatmapData.length, 'data points');
              }
            }
            break;

          case 'geoanalysis':
            // Enable quarter analytics click mode
            console.log('Geo-analysis mode activated - click on map for quarter analytics');
            await leafletMapService.enableClickMode(mapId, async (lat: number, lng: number) => {
              console.log('Map clicked for analytics at:', lat, lng);
              
              // Get address for the clicked location
              try {
                const reverseGeoResult = await openStreetMapService.reverseGeocode(lat, lng);
                const address = openStreetMapService.formatAddress(reverseGeoResult);
                setAnalyticsAddress(address);
              } catch (error) {
                console.error('Error getting address:', error);
                setAnalyticsAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
              }
              
              setAnalyticsPosition([lat, lng]);
            });
            break;

          case 'investment':
            // Add investment analysis overlays
            console.log('Investment analysis mode activated');
            break;

          default:
            // Clear all special layers for 'none' mode and disable click mode
            await leafletMapService.disableClickMode(mapId);
            break;
        }
      } catch (error) {
        console.error('Error handling map tool change:', error);
      }
    };

    handleMapToolChange();
  }, [activeMapTool, mapId, mapLoaded, properties]);

  // Handle closing analytics popup
  const handleCloseAnalytics = () => {
    setAnalyticsPosition(null);
    setAnalyticsAddress(null);
  };

  return (
    <>
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Quarter Analytics Popup */}
      {analyticsPosition && (
        <QuarterAnalyticsPopup
          position={analyticsPosition}
          address={analyticsAddress || undefined}
          onClose={handleCloseAnalytics}
        />
      )}
    </>
  );
}

export default PropertyMap;