import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Building, Car, Users } from 'lucide-react';

interface DistrictAnalysis {
  districtId: string;
  name: string;
  coordinates: { lat: number; lng: number };
  socialScore: number;
  commercialScore: number;
  transportScore: number;
  overallScore: number;
  investmentPotential: 'low' | 'medium' | 'high' | 'excellent';
  priceGrowthForecast: number;
  liquidityScore: number;
  developmentProjects: string[];
}

interface DistrictAnalysisProps {
  districts: DistrictAnalysis[];
  onDistrictSelect?: (district: DistrictAnalysis) => void;
}

export function DistrictAnalysisPanel({ districts, onDistrictSelect }: DistrictAnalysisProps) {
  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'excellent': return 'bg-green-500 text-white';
      case 'high': return 'bg-blue-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getPotentialLabel = (potential: string) => {
    switch (potential) {
      case 'excellent': return 'Отличный';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Неизвестно';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building className="w-4 h-4" />
          Анализ районов ({districts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {districts.slice(0, 10).map((district) => (
          <Card 
            key={district.districtId} 
            className="p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onDistrictSelect?.(district)}
          >
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{district.name}</h4>
                <Badge className={`text-xs ${getPotentialColor(district.investmentPotential)}`}>
                  {getPotentialLabel(district.investmentPotential)}
                </Badge>
              </div>

              {/* Overall Score */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Общий балл:</span>
                <span className={`font-semibold text-sm ${getScoreColor(district.overallScore)}`}>
                  {Math.round(district.overallScore)}/100
                </span>
                <Progress 
                  value={district.overallScore} 
                  className="flex-1 h-1"
                />
              </div>

              {/* Individual Scores */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-500" />
                  <div>
                    <div className="text-gray-600">Социальная</div>
                    <div className={`font-medium ${getScoreColor(district.socialScore)}`}>
                      {Math.round(district.socialScore)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Car className="w-3 h-3 text-green-500" />
                  <div>
                    <div className="text-gray-600">Транспорт</div>
                    <div className={`font-medium ${getScoreColor(district.transportScore)}`}>
                      {Math.round(district.transportScore)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Building className="w-3 h-3 text-purple-500" />
                  <div>
                    <div className="text-gray-600">Коммерция</div>
                    <div className={`font-medium ${getScoreColor(district.commercialScore)}`}>
                      {Math.round(district.commercialScore)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Investment Metrics */}
              <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-gray-600">Рост цен:</span>
                  <span className="font-medium text-green-600">
                    +{district.priceGrowthForecast.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Ликвидность:</span>
                  <span className="font-medium ml-1">
                    {Math.round(district.liquidityScore)}/100
                  </span>
                </div>
              </div>

              {/* Development Projects */}
              {district.developmentProjects.length > 0 && (
                <div className="text-xs">
                  <div className="text-gray-600 mb-1">Проекты развития:</div>
                  <div className="flex flex-wrap gap-1">
                    {district.developmentProjects.slice(0, 2).map((project, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {project}
                      </Badge>
                    ))}
                    {district.developmentProjects.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{district.developmentProjects.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}

        {districts.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">
            Выберите регион для анализа районов
          </div>
        )}
      </CardContent>
    </Card>
  );
}