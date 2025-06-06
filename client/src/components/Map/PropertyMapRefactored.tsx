import { useEffect } from 'react';
import type { Property } from '@/types';
import { safePromise } from '@/lib/errorHandling';
import { trackMapEvent } from '@/lib/yandexMetrika';
import { leafletMapService } from '@/services/leafletMapService';
import { FullscreenMapModal } from './FullscreenMapModal';
import { MapControls } from './components/MapControls';
import { SearchResults } from './components/SearchResults';
import { PropertyPopup } from './components/PropertyPopup';
import { useMapState } from './hooks/useMapState';
import { useMapSearch } from './hooks/useMapSearch';

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
  const {
    mapContainer,
    mapId,
    setMapId,
    mapLoaded,
    setMapLoaded,
    heatmapMode,
    setHeatmapMode,
    heatmapIntensity,
    setHeatmapIntensity,
    selectedPropertyState,
    setSelectedProperty,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    showFullscreenModal,
    setShowFullscreenModal
  } = useMapState();

  const { performSearch, handleSearchResultSelect } = useMapSearch(
    setSearchResults,
    setIsSearching,
    mapId
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapId) return;

    const initializeMap = async () => {
      const [newMapId] = await safePromise(
        leafletMapService.createMap(mapContainer.current!, {
          center: [55.7558, 37.6176], // Moscow
          zoom: 10
        })
      );

      if (newMapId) {
        setMapId(newMapId);
        setMapLoaded(true);
        trackMapEvent('map_initialized');
      }
    };

    initializeMap();

    return () => {
      if (mapId) {
        leafletMapService.destroyMap(mapId);
      }
    };
  }, [mapContainer, mapId, setMapId, setMapLoaded]);

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
            position: { lat, lng },
            popup: property,
            className: property.propertyClass?.name || '',
            price: property.price
          };
        });

      await safePromise(
        leafletMapService.addPropertyMarkers(mapId, propertyMarkers, {
          onMarkerClick: (property: Property) => {
            setSelectedProperty(property);
            onPropertySelect?.(property);
          },
          getMarkerColor: (className: string) => getPropertyClassColor(className)
        })
      );
    };

    updateProperties();
  }, [mapId, mapLoaded, properties, onPropertySelect, setSelectedProperty]);

  // Handle heatmap mode changes
  useEffect(() => {
    if (!mapId || !mapLoaded) return;

    const updateHeatmap = async () => {
      if (heatmapMode === 'none') {
        await safePromise(leafletMapService.removeHeatmap(mapId));
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
              intensity = property.analytics?.investmentScore ? 
                property.analytics.investmentScore / 10 : 0.3;
              break;
          }

          return { lat, lng, intensity: intensity * heatmapIntensity };
        });

      await safePromise(
        leafletMapService.addHeatmap(mapId, heatmapData, {
          radius: 25,
          blur: 15,
          maxZoom: 17
        })
      );
    };

    updateHeatmap();
  }, [mapId, mapLoaded, heatmapMode, heatmapIntensity, properties]);

  // Handle selected property highlight
  useEffect(() => {
    if (!mapId || !selectedProperty) return;

    const highlightProperty = async () => {
      if (selectedProperty.coordinates) {
        const [lat, lng] = selectedProperty.coordinates.split(',').map(Number);
        await safePromise(
          leafletMapService.highlightMarker(mapId, selectedProperty.id, { lat, lng })
        );
      }
    };

    highlightProperty();
  }, [mapId, selectedProperty]);

  const handleSearchSubmit = () => {
    performSearch(searchQuery);
  };

  const handleSearchResultSelect = async (result: any) => {
    await handleSearchResultSelect(result);
  };

  return (
    <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
      <MapControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        heatmapMode={heatmapMode}
        onHeatmapModeChange={setHeatmapMode}
        heatmapIntensity={heatmapIntensity}
        onHeatmapIntensityChange={setHeatmapIntensity}
        onFullscreenToggle={() => setShowFullscreenModal(true)}
        isSearching={isSearching}
      />

      {searchResults.length > 0 && (
        <SearchResults
          results={searchResults}
          onResultSelect={handleSearchResultSelect}
          onClose={() => setSearchResults([])}
        />
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreenModal && (
        <FullscreenMapModal
          properties={properties}
          selectedProperty={selectedPropertyState}
          onPropertySelect={onPropertySelect}
          onClose={() => setShowFullscreenModal(false)}
        />
      )}
    </div>
  );
}