import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Target, Palette, Trash2, BarChart3 } from 'lucide-react';

interface Polygon {
  id: number;
  userId: number;
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface PolygonArea {
  totalProperties: number;
  avgPrice: number;
  avgPricePerSqm: number;
  priceRange: { min: number; max: number };
  propertyTypes: Record<string, number>;
  investmentScore: number;
  infrastructureScore: number;
  transportScore: number;
  developmentPotential: 'low' | 'medium' | 'high' | 'excellent';
  estimatedGrowth: number;
}

interface PolygonControlsProps {
  isDrawingPolygon: boolean;
  onToggleDrawing: () => void;
  polygonPoints: Array<{ lat: number; lng: number }>;
  onSavePolygon: (data: {
    name: string;
    coordinates: Array<{ lat: number; lng: number }>;
    color: string;
    description?: string;
  }) => void;
  polygons: Polygon[];
  onDeletePolygon: (polygonId: number) => void;
  onAnalyzePolygon: (polygonId: number) => void;
  analysisResult?: PolygonArea | null;
}

export function PolygonControls({
  isDrawingPolygon,
  onToggleDrawing,
  polygonPoints,
  onSavePolygon,
  polygons,
  onDeletePolygon,
  onAnalyzePolygon,
  analysisResult
}: PolygonControlsProps) {
  const [polygonName, setPolygonName] = useState('');
  const [polygonDescription, setPolygonDescription] = useState('');
  const [polygonColor, setPolygonColor] = useState('#3B82F6');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSavePolygon = () => {
    if (polygonPoints.length >= 3 && polygonName.trim()) {
      onSavePolygon({
        name: polygonName.trim(),
        coordinates: polygonPoints,
        color: polygonColor,
        description: polygonDescription.trim() || undefined
      });
      
      // Reset form
      setPolygonName('');
      setPolygonDescription('');
      setPolygonColor('#3B82F6');
      setIsDialogOpen(false);
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'excellent': return 'bg-green-500';
      case 'high': return 'bg-blue-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Target className="w-4 h-4" />
          Полигоны и области
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drawing Controls */}
        <div className="space-y-2">
          <Button
            variant={isDrawingPolygon ? "destructive" : "default"}
            size="sm"
            onClick={onToggleDrawing}
            className="w-full"
          >
            {isDrawingPolygon ? 'Отменить рисование' : 'Нарисовать область'}
          </Button>

          {isDrawingPolygon && (
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
              Кликайте по карте для добавления точек полигона. 
              Минимум 3 точки для создания области.
              <div className="mt-1 font-medium">
                Точек создано: {polygonPoints.length}
              </div>
            </div>
          )}

          {isDrawingPolygon && polygonPoints.length >= 3 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full">
                  Завершить полигон
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Сохранить область</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Название области *
                    </label>
                    <Input
                      placeholder="Например: Центральный район"
                      value={polygonName}
                      onChange={(e) => setPolygonName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Описание (опционально)
                    </label>
                    <Input
                      placeholder="Краткое описание области"
                      value={polygonDescription}
                      onChange={(e) => setPolygonDescription(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Цвет области
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={polygonColor}
                        onChange={(e) => setPolygonColor(e.target.value)}
                        className="w-12 h-8 border rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-600">{polygonColor}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSavePolygon}
                    disabled={!polygonName.trim() || polygonPoints.length < 3}
                    className="w-full"
                  >
                    Сохранить область
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Saved Polygons */}
        {polygons.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Сохраненные области ({polygons.length})</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {polygons.map((polygon) => (
                <div key={polygon.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded flex-shrink-0" 
                      style={{ backgroundColor: polygon.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{polygon.name}</div>
                      {polygon.description && (
                        <div className="text-gray-600 truncate">{polygon.description}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAnalyzePolygon(polygon.id)}
                      className="h-6 w-6 p-0"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDeletePolygon(polygon.id)}
                      className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Анализ области
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-600">Объектов</div>
                  <div className="font-semibold">{analysisResult.totalProperties}</div>
                </div>
                <div>
                  <div className="text-gray-600">Средняя цена</div>
                  <div className="font-semibold">{formatPrice(analysisResult.avgPrice)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Цена за м²</div>
                  <div className="font-semibold">{formatPrice(analysisResult.avgPricePerSqm)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Потенциал</div>
                  <Badge className={`text-xs ${getPotentialColor(analysisResult.developmentPotential)}`}>
                    {analysisResult.developmentPotential}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Инвестиционный балл:</span>
                  <span className="font-medium">{Math.round(analysisResult.investmentScore)}/100</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Инфраструктура:</span>
                  <span className="font-medium">{Math.round(analysisResult.infrastructureScore)}/100</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Транспорт:</span>
                  <span className="font-medium">{Math.round(analysisResult.transportScore)}/100</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Прогноз роста:</span>
                  <span className="font-medium text-green-600">+{analysisResult.estimatedGrowth.toFixed(1)}%</span>
                </div>
              </div>

              {Object.keys(analysisResult.propertyTypes).length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Типы объектов:</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(analysisResult.propertyTypes).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}