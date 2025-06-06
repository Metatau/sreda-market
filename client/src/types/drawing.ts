// Types for map drawing functionality
export interface DrawingControls {
  polygon: boolean;
  trash: boolean;
  combine_features: boolean;
  uncombine_features: boolean;
}

export interface DrawnPolygon {
  id: string;
  type: 'Polygon';
  coordinates: number[][][];
  area: number;
  properties: Record<string, any>;
}

export interface DrawingEvent {
  type: 'create' | 'update' | 'delete' | 'modechange';
  features: any[];
  mode?: string;
}

export interface AreaSearchParams {
  polygon: number[][];
  includeProperties?: string[];
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    rooms?: number;
    propertyType?: string;
  };
}

// Declare global types for Mapbox GL Draw
declare global {
  interface Window {
    MapboxDraw: any;
  }
}