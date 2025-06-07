import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, MapPin, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { GeospatialStats } from '../types/geospatial';

interface StatisticsPanelProps {
  stats: GeospatialStats | null;
  isVisible: boolean;
  onClose: () => void;
}

export function StatisticsPanel({ stats, isVisible, onClose }: StatisticsPanelProps) {
  if (!isVisible || !stats) return null;

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)} млн ₽`;
    }
    return `${Math.round(price).toLocaleString()} ₽`;
  };

  const formatArea = (area: number) => {
    if (area >= 10000) {
      return `${(area / 10000).toFixed(1)} га`;
    }
    return `${Math.round(area)} м²`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < -5) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 5) return 'text-green-600';
    if (value < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getDemandBadgeColor = (trend: string) => {
    switch (trend) {
      case 'rising': return 'bg-green-100 text-green-800';
      case 'declining': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getActivityBadgeColor = (activity: string) => {
    switch (activity) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="absolute top-4 right-4 w-80 z-10">
      <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Статистика области
            </CardTitle>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Основные показатели */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Объекты</span>
              </div>
              <div className="text-xl font-bold text-blue-900">
                {stats.selectedArea.totalProperties}
              </div>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Средняя цена</span>
              </div>
              <div className="text-lg font-bold text-green-900">
                {formatPrice(stats.selectedArea.averagePrice)}
              </div>
            </div>
          </div>

          {/* Детальная информация */}
          <div className="space-y-3">
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-900 mb-2">Детали выборки</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Цена за м²:</span>
                  <span className="font-medium">{formatPrice(stats.selectedArea.averagePricePerSqm)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Диапазон цен:</span>
                  <span className="font-medium">
                    {formatPrice(stats.selectedArea.priceRange[0])} - {formatPrice(stats.selectedArea.priceRange[1])}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Общая площадь:</span>
                  <span className="font-medium">{formatArea(stats.selectedArea.totalArea)}</span>
                </div>
              </div>
            </div>

            {/* Инвестиционные показатели */}
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-900 mb-2">Инвестиционные метрики</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Инвестиционная оценка</span>
                    <span className="text-sm font-medium">{stats.selectedArea.investmentScore.toFixed(1)}/100</span>
                  </div>
                  <Progress value={stats.selectedArea.investmentScore} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Индекс ликвидности</span>
                    <span className="text-sm font-medium">{stats.selectedArea.liquidityIndex.toFixed(1)}/100</span>
                  </div>
                  <Progress value={stats.selectedArea.liquidityIndex} className="h-2" />
                </div>
              </div>
            </div>

            {/* Сравнение с рынком */}
            <div className="border-b pb-2">
              <h4 className="font-medium text-gray-900 mb-2">Сравнение с рынком</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Средняя по городу:</span>
                  <span className="font-medium">{formatPrice(stats.comparison.cityAverage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Средняя по региону:</span>
                  <span className="font-medium">{formatPrice(stats.comparison.regionAverage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Процентиль:</span>
                  <span className="font-medium">{stats.comparison.percentile.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Тренды */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Тренды и активность</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Рост за 6 месяцев:</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(stats.trends.priceGrowth6m)}
                    <span className={`text-sm font-medium ${getTrendColor(stats.trends.priceGrowth6m)}`}>
                      {stats.trends.priceGrowth6m > 0 ? '+' : ''}{stats.trends.priceGrowth6m.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Рост за год:</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(stats.trends.priceGrowth1y)}
                    <span className={`text-sm font-medium ${getTrendColor(stats.trends.priceGrowth1y)}`}>
                      {stats.trends.priceGrowth1y > 0 ? '+' : ''}{stats.trends.priceGrowth1y.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Тренд спроса:</span>
                  <Badge className={getDemandBadgeColor(stats.trends.demandTrend)}>
                    {stats.trends.demandTrend === 'rising' ? 'Растет' : 
                     stats.trends.demandTrend === 'declining' ? 'Снижается' : 'Стабильный'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Активность рынка:</span>
                  <Badge className={getActivityBadgeColor(stats.trends.marketActivity)}>
                    {stats.trends.marketActivity === 'high' ? 'Высокая' : 
                     stats.trends.marketActivity === 'low' ? 'Низкая' : 'Средняя'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}