import React, { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useMapData } from "@/hooks/useProperties";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@/types";

import "mapbox-gl/dist/mapbox-gl.css";

interface PropertyMapProps {
  selectedRegionId?: number;
  selectedPropertyClassId?: number;
  onPropertySelect?: (property: Property) => void;
}

export function PropertyMap({
  selectedRegionId,
  selectedPropertyClassId,
  onPropertySelect,
}: PropertyMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);

  const { data: mapData, isLoading } = useMapData({
    regionId: selectedRegionId,
    propertyClassId: selectedPropertyClassId,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [37.6176, 55.7558], // Moscow center
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !mapData?.features) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add new markers
    mapData.features.forEach((feature: any) => {
      const { coordinates } = feature.geometry;
      const properties = feature.properties;

      // Create marker element
      const markerElement = document.createElement("div");
      markerElement.className = "property-marker";
      markerElement.innerHTML = `
        <div class="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
          ${(properties.price / 1000000).toFixed(1)}M ₽
        </div>
      `;

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat(coordinates)
        .addTo(map.current!);

      // Add click handler
      markerElement.addEventListener("click", () => {
        setSelectedProperty(properties);
        onPropertySelect?.(properties);
      });

      markers.current.push(marker);
    });

    // Fit map to markers if we have data
    if (mapData.features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      mapData.features.forEach((feature: any) => {
        bounds.extend(feature.geometry.coordinates);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [mapData, onPropertySelect]);

  // Toggle heatmap
  useEffect(() => {
    if (!map.current || !mapData?.features) return;

    if (showHeatmap) {
      // Add heatmap source and layer
      if (!map.current.getSource("properties-heat")) {
        map.current.addSource("properties-heat", {
          type: "geojson",
          data: mapData,
        });

        map.current.addLayer({
          id: "properties-heatmap",
          type: "heatmap",
          source: "properties-heat",
          maxzoom: 15,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "price"],
              0, 0,
              50000000, 1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0, 1,
              15, 3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(33,102,172,0)",
              0.2, "rgb(103,169,207)",
              0.4, "rgb(209,229,240)",
              0.6, "rgb(253,219,199)",
              0.8, "rgb(239,138,98)",
              1, "rgb(178,24,43)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0, 2,
              15, 20,
            ],
          },
        });
      }

      // Hide markers
      markers.current.forEach((marker) => marker.getElement().style.display = "none");
    } else {
      // Remove heatmap layer
      if (map.current.getLayer("properties-heatmap")) {
        map.current.removeLayer("properties-heatmap");
      }
      if (map.current.getSource("properties-heat")) {
        map.current.removeSource("properties-heat");
      }

      // Show markers
      markers.current.forEach((marker) => marker.getElement().style.display = "block");
    }
  }, [showHeatmap, mapData]);

  const getPropertyClassColor = (className?: string) => {
    const colors = {
      "Эконом": "bg-blue-500",
      "Стандарт": "bg-green-500",
      "Комфорт": "bg-yellow-500",
      "Бизнес": "bg-purple-500",
      "Элит": "bg-orange-500",
    };
    return colors[className as keyof typeof colors] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
            <p className="text-gray-500">Загрузка карты...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-10 flex space-x-2">
          <Button
            variant={showHeatmap ? "default" : "secondary"}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <i className="fas fa-fire mr-1"></i>
            Тепловая карта
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <i className="fas fa-layer-group mr-1"></i>
            Кластеры
          </Button>
        </div>

        {/* Map Legend */}
        <div className="absolute top-4 right-4 z-10 bg-white/90 rounded-lg shadow-md p-3">
          <h4 className="text-sm font-medium mb-2">Классы недвижимости</h4>
          <div className="space-y-1 text-xs">
            {["Эконом", "Стандарт", "Комфорт", "Бизнес", "Элит"].map((className) => (
              <div key={className} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getPropertyClassColor(className)}`}></div>
                <span>{className}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div ref={mapContainer} className="h-96 w-full" />

        {/* Property Info Popup */}
        {selectedProperty && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <Card className="max-w-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{selectedProperty.title}</h4>
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
                    <span className="font-semibold">{selectedProperty.price?.toLocaleString()} ₽</span>
                  </div>
                  
                  {selectedProperty.pricePerSqm && (
                    <div className="flex items-center justify-between">
                      <span>За м²:</span>
                      <span className="font-semibold">{selectedProperty.pricePerSqm.toLocaleString()} ₽</span>
                    </div>
                  )}
                  
                  {selectedProperty.rooms && (
                    <div className="flex items-center justify-between">
                      <span>Комнат:</span>
                      <span className="font-semibold">{selectedProperty.rooms}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 pt-1 border-t">
                    {selectedProperty.address}
                  </div>
                  
                  {selectedProperty.propertyClass && (
                    <div className="pt-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedProperty.propertyClass}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => onPropertySelect?.(selectedProperty)}
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
