import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Layers, MapPin, Maximize2, Minimize2 } from 'lucide-react';
import { AdvancedHeatmapControls } from './analytics/AdvancedHeatmapControls';
import { StatisticsPanel } from './analytics/StatisticsPanel';
import { DrawingTools } from './tools/DrawingTools';
import { GeospatialService } from './services/GeospatialService';
import { AdvancedHeatmapMode, DrawingTool, GeospatialStats, MeasurementResult, HeatmapDataPoint } from './types/geospatial';
import type { PropertyWithRelations } from '@/types';

interface InteractiveAnalyticsMapProps {
  properties: PropertyWithRelations[];
  onPropertySelect?: (property: PropertyWithRelations) => void;
  className?: string;
}

export function InteractiveAnalyticsMap({ 
  properties, 
  onPropertySelect, 
  className = '' 
}: InteractiveAnalyticsMapProps) {
  // State management
  const [heatmapMode, setHeatmapMode] = useState<AdvancedHeatmapMode>('none');
  const [heatmapIntensity, setHeatmapIntensity] = useState(1.0);
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult | null>(null);
  const [geospatialStats, setGeospatialStats] = useState<GeospatialStats | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithRelations | null>(null);

  // Map container reference
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Computed heatmap data
  const heatmapData = (() => {
    if (heatmapMode === 'none' || !properties.length) return [];
    return GeospatialService.generateHeatmapData(properties, heatmapMode);
  })();

  // Analytics handlers
  const handleToolSelect = (tool: DrawingTool) => {
    setActiveTool(tool.isActive ? tool : null);
    if (!tool.isActive) {
      setMeasurementResult(null);
      setGeospatialStats(null);
      setShowStatistics(false);
    }
  };

  const handleClearAll = () => {
    setActiveTool(null);
    setMeasurementResult(null);
    setGeospatialStats(null);
    setShowStatistics(false);
  };

  const handleAreaSelection = (bounds: any) => {
    const stats = GeospatialService.calculateAreaStats(properties, bounds);
    setGeospatialStats(stats);
    setShowStatistics(true);
  };

  const handlePropertyClick = (property: PropertyWithRelations) => {
    setSelectedProperty(property);
    onPropertySelect?.(property);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Simulate map interactions
  useEffect(() => {
    if (activeTool?.type === 'circle' && mapContainerRef.current) {
      // Simulate area selection for demonstration
      const timeout = setTimeout(() => {
        handleAreaSelection({
          north: 55.7558,
          south: 55.7358,
          east: 37.6176,
          west: 37.5976
        });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [activeTool]);

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''} ${className}`}>
      {/* Map Container */}
      <div className={`bg-white rounded-lg border shadow-lg overflow-hidden ${isFullscreen ? 'h-full' : 'h-[600px]'}`}>
        <div 
          ref={mapContainerRef}
          className="h-full relative bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center"
        >
          {/* Interactive Map Simulation */}
          <div className="absolute inset-0">
            {/* Base Map Layer */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 800 600">
                {/* Simulated street grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Major roads */}
                <path d="M0,300 L800,300" stroke="#94a3b8" strokeWidth="3" />
                <path d="M400,0 L400,600" stroke="#94a3b8" strokeWidth="3" />
                <path d="M0,150 L800,150" stroke="#e2e8f0" strokeWidth="2" />
                <path d="M0,450 L800,450" stroke="#e2e8f0" strokeWidth="2" />
                <path d="M200,0 L200,600" stroke="#e2e8f0" strokeWidth="2" />
                <path d="M600,0 L600,600" stroke="#e2e8f0" strokeWidth="2" />
              </svg>
            </div>

            {/* Property Markers */}
            {properties.slice(0, 20).map((property, index) => {
              const x = 50 + (index % 10) * 70;
              const y = 50 + Math.floor(index / 10) * 80;
              const isSelected = selectedProperty?.id === property.id;
              
              return (
                <div
                  key={property.id}
                  className={`absolute w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'bg-red-500 ring-4 ring-red-200 scale-150' 
                      : 'bg-blue-500 hover:bg-blue-600 hover:scale-125'
                  }`}
                  style={{ left: x, top: y }}
                  onClick={() => handlePropertyClick(property)}
                  title={property.address}
                />
              );
            })}

            {/* Heatmap Overlay */}
            {heatmapMode !== 'none' && heatmapData.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {heatmapData.slice(0, 15).map((point, index) => {
                  const x = 50 + (index % 10) * 70;
                  const y = 50 + Math.floor(index / 10) * 80;
                  const intensity = Math.min(1, point.value / 100000) * heatmapIntensity;
                  
                  return (
                    <div
                      key={index}
                      className="absolute rounded-full"
                      style={{
                        left: x - 20,
                        top: y - 20,
                        width: 40,
                        height: 40,
                        background: `radial-gradient(circle, rgba(239, 68, 68, ${intensity * 0.6}) 0%, rgba(239, 68, 68, ${intensity * 0.3}) 50%, transparent 100%)`,
                        pointerEvents: 'none'
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Drawing Tool Overlays */}
            {activeTool && (
              <div className="absolute inset-0 pointer-events-none">
                {activeTool.type === 'circle' && (
                  <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border-2 border-blue-500 border-dashed transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                )}
                {activeTool.type === 'rectangle' && (
                  <div className="absolute top-1/4 left-1/4 w-64 h-32 border-2 border-green-500 border-dashed animate-pulse" />
                )}
                {activeTool.type === 'polygon' && (
                  <svg className="absolute inset-0 w-full h-full">
                    <polygon 
                      points="200,200 300,150 400,200 350,300 250,300" 
                      fill="rgba(147, 51, 234, 0.1)" 
                      stroke="#9333ea" 
                      strokeWidth="2" 
                      strokeDasharray="5,5"
                      className="animate-pulse"
                    />
                  </svg>
                )}
              </div>
            )}

            {/* Center placeholder content when no tools are active */}
            {!activeTool && heatmapMode === 'none' && (
              <div className="text-center space-y-4 z-10 relative">
                <Layers className="h-12 w-12 text-blue-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Интерактивная аналитическая карта
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Расширенная визуализация недвижимости с тепловыми картами, 
                    геоаналитикой и инструментами измерения областей
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Controls - Left Panel */}
      <div className="absolute top-4 left-4 z-20">
        <AdvancedHeatmapControls
          mode={heatmapMode}
          onModeChange={setHeatmapMode}
          intensity={heatmapIntensity}
          onIntensityChange={setHeatmapIntensity}
          propertyCount={properties.length}
        />
      </div>

      {/* Drawing Tools - Right Panel */}
      <div className="absolute top-4 right-4 z-20">
        <DrawingTools
          activeTool={activeTool}
          onToolSelect={handleToolSelect}
          onClearAll={handleClearAll}
          measurementResult={measurementResult}
          isDrawing={!!activeTool}
        />
      </div>

      {/* Fullscreen Toggle */}
      <div className="absolute bottom-4 right-4 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-white/90 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Statistics Panel */}
      <StatisticsPanel
        stats={geospatialStats}
        isVisible={showStatistics}
        onClose={() => setShowStatistics(false)}
      />

      {/* Heatmap Data Summary */}
      {heatmapMode !== 'none' && heatmapData.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20">
          <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-red-600 rounded"></div>
                <span className="font-medium">
                  Обработано {heatmapData.length} точек данных
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Property Info Popup */}
      {selectedProperty && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <Card className="bg-white border shadow-lg max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">
                  {selectedProperty.propertyType || 'Недвижимость'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProperty(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              <h4 className="font-medium mb-2">{selectedProperty.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{selectedProperty.address}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Цена:</span>
                  <div className="font-medium">
                    {selectedProperty.price ? `${(selectedProperty.price / 1000000).toFixed(1)} млн ₽` : 'Не указана'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Площадь:</span>
                  <div className="font-medium">
                    {selectedProperty.area ? `${selectedProperty.area} м²` : 'Не указана'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}