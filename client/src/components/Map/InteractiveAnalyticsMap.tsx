import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';
import { AdvancedHeatmapControls } from './analytics/AdvancedHeatmapControls';
import { StatisticsPanel } from './analytics/StatisticsPanel';
import { DrawingTools } from './tools/DrawingTools';
import { GeospatialService } from './services/GeospatialService';
import { AdvancedHeatmapMode, DrawingTool, GeospatialStats, MeasurementResult } from './types/geospatial';
import type { PropertyWithRelations } from '@/types';

// Import existing map components
import { PropertyMap } from './PropertyMapRefactored';

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

  const handlePropertyClick = (property: PropertyWithRelations) => {
    setSelectedProperty(property);
    onPropertySelect?.(property);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''} ${className}`}>
      {/* Map Container with Real Map */}
      <div className={`relative ${isFullscreen ? 'h-full' : 'h-[600px]'} overflow-hidden rounded-lg border shadow-lg`}>
        <PropertyMap 
          properties={properties}
          selectedProperty={selectedProperty}
          onPropertySelect={handlePropertyClick}
        />

        {/* Heatmap Controls - Left Panel */}
        <div className="absolute top-4 left-4 z-10">
          <AdvancedHeatmapControls
            mode={heatmapMode}
            onModeChange={setHeatmapMode}
            intensity={heatmapIntensity}
            onIntensityChange={setHeatmapIntensity}
            propertyCount={properties.length}
          />
        </div>

        {/* Drawing Tools - Right Panel */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-white/90 backdrop-blur-sm"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <DrawingTools
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
            onClearAll={handleClearAll}
            measurementResult={measurementResult}
            isDrawing={false}
          />
        </div>

        {/* Statistics Panel */}
        <StatisticsPanel
          stats={geospatialStats}
          isVisible={showStatistics}
          onClose={() => setShowStatistics(false)}
        />

        {/* Heatmap Data Summary */}
        {heatmapMode !== 'none' && heatmapData.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10">
            <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-red-600 rounded"></div>
                  <span className="font-medium">
                    Режим: {heatmapMode} | Обработано {heatmapData.length} точек данных
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Selected Property Info */}
        {selectedProperty && (
          <div className="absolute bottom-4 right-4 z-10">
            <Card className="bg-white/95 backdrop-blur-sm border shadow-lg max-w-sm">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="font-medium text-sm">{selectedProperty.address}</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Цена: {selectedProperty.price?.toLocaleString('ru-RU')} ₽</div>
                    {selectedProperty.pricePerSqm && (
                      <div>За м²: {selectedProperty.pricePerSqm.toLocaleString('ru-RU')} ₽</div>
                    )}
                    {selectedProperty.area && <div>Площадь: {selectedProperty.area} м²</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedProperty(null)}
                    className="w-full"
                  >
                    Закрыть
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}