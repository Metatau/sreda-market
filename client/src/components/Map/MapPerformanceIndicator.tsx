import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Database, Clock, MapPin } from 'lucide-react';

interface PerformanceData {
  cached: boolean;
  source: 'preloaded' | 'database' | 'default';
  loadTime?: number;
  dataSize?: number;
}

interface MapPerformanceIndicatorProps {
  heatmapPerformance?: PerformanceData;
  infrastructurePerformance?: PerformanceData;
  propertiesCount?: number;
  isVisible?: boolean;
}

export function MapPerformanceIndicator({
  heatmapPerformance,
  infrastructurePerformance,
  propertiesCount = 0,
  isVisible = true
}: MapPerformanceIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible) return null;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'preloaded':
        return <Zap className="h-3 w-3 text-green-500" />;
      case 'database':
        return <Database className="h-3 w-3 text-blue-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'preloaded':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'database':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSourceText = (source: string) => {
    switch (source) {
      case 'preloaded':
        return 'Предзагружено';
      case 'database':
        return 'База данных';
      default:
        return 'По умолчанию';
    }
  };

  const hasPreloadedData = heatmapPerformance?.source === 'preloaded' || 
                          infrastructurePerformance?.source === 'preloaded';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card 
        className="bg-white/95 backdrop-blur-sm shadow-lg border cursor-pointer transition-all duration-200 hover:shadow-xl"
        onClick={() => setShowDetails(!showDetails)}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">
              Производительность карты
            </span>
            {hasPreloadedData && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Ускорено
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <span className="font-medium">{propertiesCount}</span>
              <span>объектов</span>
            </div>
            
            {heatmapPerformance && (
              <div className="flex items-center gap-1">
                {getSourceIcon(heatmapPerformance.source)}
                <span>Тепловая карта</span>
              </div>
            )}
          </div>

          {showDetails && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              {heatmapPerformance && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Тепловая карта:</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getSourceColor(heatmapPerformance.source)}`}
                  >
                    {getSourceIcon(heatmapPerformance.source)}
                    <span className="ml-1">{getSourceText(heatmapPerformance.source)}</span>
                  </Badge>
                </div>
              )}

              {infrastructurePerformance && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Инфраструктура:</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getSourceColor(infrastructurePerformance.source)}`}
                  >
                    {getSourceIcon(infrastructurePerformance.source)}
                    <span className="ml-1">{getSourceText(infrastructurePerformance.source)}</span>
                  </Badge>
                </div>
              )}

              {hasPreloadedData && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span className="font-medium">Предзагрузка активна</span>
                  </div>
                  <div className="text-green-600 mt-1">
                    Данные загружены из кэша для быстрого отображения
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}