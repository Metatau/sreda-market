import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMapData } from "@/hooks/useProperties";
import type { Property } from "@/types";

interface PropertyMapProps {
  filters?: {
    regionId?: number;
    propertyClassId?: number;
  };
  onPropertySelect?: (property: Property) => void;
}

// Mock Mapbox-like implementation since we can't use actual Mapbox without API key
export function PropertyMap({ filters, onPropertySelect }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  
  const { data: mapData, isLoading } = useMapData(filters);

  useEffect(() => {
    if (mapRef.current && mapData) {
      // In a real implementation, this would initialize Mapbox GL JS
      console.log("Map data loaded:", mapData.features.length, "properties");
    }
  }, [mapData]);

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

  const propertyClassColors = {
    "Эконом": "bg-blue-500",
    "Стандарт": "bg-emerald-500", 
    "Комфорт": "bg-amber-500",
    "Бизнес": "bg-purple-500",
    "Элит": "bg-orange-500",
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle>Карта объектов</CardTitle>
            <span className="text-sm text-gray-500">
              {mapData?.features.length || 0} объектов на карте
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHeatmap(!showHeatmap)}
            >
              <i className="fas fa-fire mr-1"></i>
              Тепловая карта
            </Button>
            <Button
              variant={!showHeatmap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHeatmap(false)}
            >
              <i className="fas fa-map-marker-alt mr-1"></i>
              Маркеры
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          {/* Map Legend */}
          <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-md p-3">
            <h4 className="text-sm font-medium mb-2">Классы недвижимости</h4>
            <div className="space-y-1 text-xs">
              {Object.entries(propertyClassColors).map(([className, color]) => (
                <div key={className} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 ${color} rounded-full`}></div>
                  <span>{className}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map Container */}
          <div 
            ref={mapRef}
            className="h-96 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1542044896530-05d85be9b11a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=800')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay for better marker visibility */}
            <div className="absolute inset-0 bg-black/20"></div>
            
            {/* Property Markers */}
            {!showHeatmap && mapData?.features.map((feature, index) => {
              const { properties: props } = feature;
              const className = props.propertyClass || "Стандарт";
              const baseColor = propertyClassColors[className as keyof typeof propertyClassColors] || "bg-blue-500";
              
              // Position markers in a grid-like pattern for demo
              const left = 20 + (index % 8) * 12;
              const top = 20 + Math.floor(index / 8) * 15;
              
              return (
                <div
                  key={props.id}
                  className={`absolute ${baseColor} text-white rounded-lg px-2 py-1 text-xs font-semibold shadow-lg cursor-pointer hover:scale-110 transition-transform z-20`}
                  style={{ 
                    left: `${left}%`, 
                    top: `${top}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => setSelectedMarker(props)}
                >
                  {(props.price / 1000000).toFixed(1)}M ₽
                </div>
              );
            })}

            {/* Heatmap Effect */}
            {showHeatmap && (
              <div className="absolute inset-0 z-10">
                <div className="absolute inset-0 bg-gradient-radial from-red-500/30 via-yellow-500/20 to-transparent"></div>
                <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-gradient-radial from-red-500/50 to-transparent rounded-full blur-xl"></div>
                <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-radial from-orange-500/40 to-transparent rounded-full blur-lg"></div>
                <div className="absolute bottom-1/3 left-1/4 w-20 h-20 bg-gradient-radial from-yellow-500/30 to-transparent rounded-full blur-lg"></div>
              </div>
            )}

            {/* Property Details Popup */}
            {selectedMarker && (
              <div 
                className="absolute bg-white rounded-lg shadow-xl p-4 max-w-sm z-30 border"
                style={{ 
                  left: '50%', 
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-sm">{selectedMarker.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMarker(null)}
                  >
                    <i className="fas fa-times"></i>
                  </Button>
                </div>
                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  <p><strong>Цена:</strong> {selectedMarker.price.toLocaleString()} ₽</p>
                  {selectedMarker.pricePerSqm && (
                    <p><strong>За м²:</strong> {selectedMarker.pricePerSqm.toLocaleString()} ₽</p>
                  )}
                  {selectedMarker.rooms && (
                    <p><strong>Комнат:</strong> {selectedMarker.rooms}</p>
                  )}
                  {selectedMarker.area && (
                    <p><strong>Площадь:</strong> {selectedMarker.area} м²</p>
                  )}
                  {selectedMarker.propertyClass && (
                    <Badge className="text-xs">{selectedMarker.propertyClass}</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onPropertySelect?.(selectedMarker as any);
                    setSelectedMarker(null);
                  }}
                >
                  Подробнее
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
