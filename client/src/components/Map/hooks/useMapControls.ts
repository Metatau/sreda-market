import { useState, useCallback } from 'react';

interface MapControlsState {
  viewType: string;
  zoomLevel: number;
  centerCoordinates: [number, number];
}

export function useMapControls() {
  const [viewType, setViewType] = useState<string>('standard');
  const [zoomLevel, setZoomLevel] = useState<number>(10);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number]>([55.7558, 37.6176]); // Moscow center

  const handleViewTypeChange = useCallback((newViewType: string) => {
    setViewType(newViewType);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoomLevel(Math.max(1, Math.min(18, newZoom)));
  }, []);

  const handleCenterChange = useCallback((newCenter: [number, number]) => {
    setCenterCoordinates(newCenter);
  }, []);

  const resetView = useCallback(() => {
    setViewType('standard');
    setZoomLevel(10);
    setCenterCoordinates([55.7558, 37.6176]);
  }, []);

  return {
    viewType,
    setViewType: handleViewTypeChange,
    zoomLevel,
    setZoomLevel: handleZoomChange,
    centerCoordinates,
    setCenterCoordinates: handleCenterChange,
    resetView
  };
}