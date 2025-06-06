import { useCallback } from 'react';
import { safePromise } from '@/lib/errorHandling';
import { openStreetMapService } from '@/services/openStreetMapService';

export function useMapSearch(
  setSearchResults: (results: any[]) => void,
  setIsSearching: (searching: boolean) => void,
  mapId: string | null
) {
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !mapId) return;

    setIsSearching(true);
    
    const [searchData] = await safePromise(
      openStreetMapService.searchLocation(query)
    );

    if (searchData?.length > 0) {
      setSearchResults(searchData.slice(0, 5));
    } else {
      setSearchResults([]);
    }
    
    setIsSearching(false);
  }, [mapId, setSearchResults, setIsSearching]);

  const handleSearchResultSelect = useCallback(async (result: any) => {
    if (!mapId) return;

    const [success] = await safePromise(
      openStreetMapService.flyToLocation(mapId, {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      }, 16)
    );

    if (success) {
      setSearchResults([]);
    }
  }, [mapId, setSearchResults]);

  return {
    performSearch,
    handleSearchResultSelect
  };
}