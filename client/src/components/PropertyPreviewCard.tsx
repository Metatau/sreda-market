import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Home, RotateCcw, Shield } from "lucide-react";

interface Property {
  id: number;
  title: string;
  address: string;
  price: number;
  pricePerSqm?: number;
  area?: string;
  rooms?: number;
}

interface InvestmentAnalytics {
  id?: number;
  propertyId?: number;
  priceChange1y?: string;
  priceChange3m?: string;
  priceVolatility?: string;
  rentalYield?: string;
  rentalIncomeMonthly?: number;
  rentalRoiAnnual?: string;
  rentalPaybackYears?: string;
  flipPotentialProfit?: number;
  flipRoi?: string;
  flipTimeframeMonths?: number;
  renovationCostEstimate?: number;
  safeHavenScore?: number;
  capitalPreservationIndex?: string;
  liquidityScore?: number;
  priceForecast3y?: string;
  infrastructureImpactScore?: string;
  developmentRiskScore?: string;
  investmentRating?: string;
  riskLevel?: string;
  recommendedStrategy?: string;
  calculatedAt?: string;
  expiresAt?: string;
}

interface PropertyPreviewCardProps {
  property: Property;
  analytics: InvestmentAnalytics;
  onClick: () => void;
}

export const PropertyPreviewCard: React.FC<PropertyPreviewCardProps> = ({
  property,
  analytics,
  onClick
}) => {
  const getRatingColor = (rating: string) => {
    const colors = {
      'A+': 'bg-green-600 text-white',
      'A': 'bg-green-500 text-white',
      'B+': 'bg-blue-600 text-white',
      'B': 'bg-blue-500 text-white',
      'C+': 'bg-orange-600 text-white',
      'C': 'bg-red-600 text-white'
    };
    return colors[rating as keyof typeof colors] || 'bg-gray-600 text-white';
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'rental': return <Home className="w-4 h-4" />;
      case 'flip': return <RotateCcw className="w-4 h-4" />;
      case 'hold': return <Shield className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getStrategyName = (strategy: string) => {
    switch (strategy) {
      case 'rental': return 'Аренда';
      case 'flip': return 'Флиппинг';
      case 'hold': return 'Долгосрочное владение';
      default: return 'Анализ';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelName = (level: string) => {
    switch (level) {
      case 'low': return 'Низкий';
      case 'moderate': return 'Средний';
      case 'high': return 'Высокий';
      default: return 'Неопределен';
    }
  };

  const getRatingDescription = (rating: string) => {
    switch (rating) {
      case 'A+': return 'Превосходные инвестиционные перспективы. Высокая доходность, низкие риски, отличная ликвидность.';
      case 'A': return 'Отличные инвестиционные возможности. Хорошая доходность и стабильные перспективы роста.';
      case 'B+': return 'Хорошие инвестиционные характеристики. Приемлемая доходность, сбалансированные риски.';
      case 'B': return 'Удовлетворительные показатели. Средняя доходность, умеренные риски.';
      case 'C+': return 'Ниже средних показателей. Низкая доходность, повышенные риски.';
      case 'C': return 'Слабые инвестиционные перспективы. Очень низкая доходность или убыточность, высокие риски.';
      default: return 'Рейтинг не определен. Требуется дополнительный анализ.';
    }
  };

  return (
    <TooltipProvider>
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
        onClick={onClick}
      >
        <CardContent className="p-6">
          {/* Заголовок и рейтинг */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                {property.title}
              </h3>
              <p className="text-sm text-gray-600 truncate">{property.address}</p>
            </div>
            {analytics.investmentRating && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={`ml-2 cursor-help ${getRatingColor(analytics.investmentRating)}`}>
                    {analytics.investmentRating}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <div className="font-semibold">Рейтинг {analytics.investmentRating}</div>
                    <div className="text-sm">{getRatingDescription(analytics.investmentRating)}</div>
                    <div className="text-xs text-gray-400 mt-2">
                      Рейтинг основан на доходности аренды, ROI флиппинга и безопасности инвестиций
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

        {/* Основная цена */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">
            {property.price.toLocaleString('ru-RU')} ₽
          </div>
          {property.pricePerSqm && (
            <div className="text-sm text-gray-600">
              {property.pricePerSqm.toLocaleString('ru-RU')} ₽/м²
            </div>
          )}
        </div>

        {/* Ключевые метрики */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Доходность аренды</div>
            <div className="text-lg font-semibold text-green-600">
              {analytics.rentalYield ? `${analytics.rentalYield}%` : 'N/A'}
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-1">Прогноз 3 года</div>
            <div className="text-lg font-semibold text-blue-600">
              {analytics.priceForecast3y ? `+${analytics.priceForecast3y}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Динамика цены */}
        <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Изменение за год:</div>
          <div className={`text-sm font-semibold flex items-center ${
            analytics.priceChange1y && parseFloat(analytics.priceChange1y) >= 0 
              ? 'text-green-600' 
              : 'text-red-600'
          }`}>
            {analytics.priceChange1y && parseFloat(analytics.priceChange1y) >= 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {analytics.priceChange1y ? 
              `${parseFloat(analytics.priceChange1y) > 0 ? '+' : ''}${analytics.priceChange1y}%` 
              : 'N/A'
            }
          </div>
        </div>

        {/* Рекомендуемая стратегия */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 mb-3">
          <div className="text-sm text-gray-600">Рекомендуемая стратегия:</div>
          <div className="flex items-center space-x-1">
            {analytics.recommendedStrategy && getStrategyIcon(analytics.recommendedStrategy)}
            <span className="text-sm font-medium">
              {analytics.recommendedStrategy ? getStrategyName(analytics.recommendedStrategy) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Индикатор риска */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Уровень риска:</span>
          {analytics.riskLevel && (
            <Badge variant="secondary" className={getRiskLevelColor(analytics.riskLevel)}>
              {getRiskLevelName(analytics.riskLevel)}
            </Badge>
          )}
        </div>

        {/* Дополнительные метрики */}
        {(analytics.flipRoi || analytics.liquidityScore) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            {analytics.flipRoi && (
              <div className="text-center">
                <div className="text-xs text-gray-600">ROI флиппинга</div>
                <div className="text-sm font-semibold text-purple-600">
                  {analytics.flipRoi}%
                </div>
              </div>
            )}
            {analytics.liquidityScore && (
              <div className="text-center">
                <div className="text-xs text-gray-600">Ликвидность</div>
                <div className="text-sm font-semibold text-orange-600">
                  {analytics.liquidityScore}/10
                </div>
              </div>
            )}
          </div>
        )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};