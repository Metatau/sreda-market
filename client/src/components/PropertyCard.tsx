import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Square, TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { formatPrice, formatArea, formatPercentage } from '@/utils/formatters';
import { RISK_LEVELS, INVESTMENT_STRATEGIES } from '@/constants';
import type { Property } from '@/types';

interface PropertyCardProps {
  property: Property;
  onSelect?: (property: Property) => void;
}

const propertyClassColors = {
  "Эконом": "bg-blue-100 text-blue-700 border-blue-200",
  "Стандарт": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Комфорт": "bg-amber-100 text-amber-700 border-amber-200",
  "Бизнес": "bg-purple-100 text-purple-700 border-purple-200",
  "Элит": "bg-orange-100 text-orange-700 border-orange-200",
};

const getPropertyImage = (property: Property) => {
  // Different images based on property class and type
  const images = {
    "Эконом": "https://images.unsplash.com/photo-1631679706909-1844bbd07221?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Стандарт": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Комфорт": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Бизнес": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Элит": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
  };

  return images[property.propertyClass?.name as keyof typeof images] || images["Стандарт"];
};

const getInvestmentRatingColor = (rating: string) => {
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

const getRiskLevelStyle = (riskLevel?: string) => {
    if (!riskLevel || !(riskLevel in RISK_LEVELS)) return '';
    return RISK_LEVELS[riskLevel as keyof typeof RISK_LEVELS].color;
  };

  const getStrategyName = (strategy?: string) => {
    if (!strategy || !(strategy in INVESTMENT_STRATEGIES)) return 'N/A';
    return INVESTMENT_STRATEGIES[strategy as keyof typeof INVESTMENT_STRATEGIES].name;
  };

export function PropertyCard({ property, onSelect }: PropertyCardProps) {
  const handleClick = () => {
    onSelect?.(property);
  };

  const propertyClassName = property.propertyClass?.name || "Стандарт";
  const colorClass = propertyClassColors[propertyClassName as keyof typeof propertyClassColors] || propertyClassColors["Стандарт"];

  const roi = property.analytics?.roi ? parseFloat(property.analytics.roi) : null;
  const liquidityScore = property.analytics?.liquidityScore || null;
  const priceGrowthRate = property.analytics?.priceGrowthRate ? parseFloat(property.analytics.priceGrowthRate) : null;

  return (
    <Card className="property-card overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleClick}>
      <div className="relative">
        <img 
          src={getPropertyImage(property)}
          alt={property.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
        />
        <div className="absolute top-3 left-3">
          {/* Property Class Badge */}
          <Badge className={`${colorClass} font-medium`}>
            {propertyClassName}
          </Badge>
        </div>



        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 hover:bg-white/80"
          onClick={(e) => {
            e.stopPropagation();
            // Handle favorite toggle
          }}
        >
          <i className="far fa-heart"></i>
        </Button>
      </div>
      <CardContent className="p-5">
        <h3 className="text-gray-900 mb-2 line-clamp-2 font-normal">{property.title}</h3>

        <div className="flex items-center text-sm text-gray-600 mb-3">
          <i className="fas fa-map-marker-alt mr-1"></i>
          <span className="truncate">{property.address}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-gray-900 text-[16px]">{property.price.toLocaleString()} ₽</div>
          {property.pricePerSqm && (
            <div className="text-sm text-gray-500">{property.pricePerSqm.toLocaleString()} ₽/м²</div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          {property.area && (
            <span><i className="fas fa-expand-arrows-alt mr-1"></i>{property.area} м²</span>
          )}
          {property.rooms && (
            <span><i className="fas fa-door-open mr-1"></i>{property.rooms} комн.</span>
          )}
          {property.floor && property.totalFloors && (
            <span><i className="fas fa-building mr-1"></i>{property.floor}/{property.totalFloors} эт.</span>
          )}
        </div>

        {/* Investment Metrics */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            {roi && (
              <div className="flex items-center bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs">
                <i className="fas fa-chart-line mr-1"></i>
                ROI {roi.toFixed(1)}%
              </div>
            )}
            {liquidityScore && (
              <div className="flex items-center bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs">
                <i className="fas fa-tachometer-alt mr-1"></i>
                {liquidityScore}/10
              </div>
            )}
            {priceGrowthRate && (
              <div className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                <i className="fas fa-trending-up mr-1"></i>
                +{priceGrowthRate.toFixed(1)}%
              </div>
            )}
          </div>

          <div className="flex items-end justify-between">
            {/* Investment Rating - positioned in bottom left */}
            <div className="flex-1">
              {property.investmentAnalytics?.investmentRating && (
                <Badge className={`${getInvestmentRatingColor(property.investmentAnalytics.investmentRating)} font-bold text-sm px-3 py-1`}>
                  {property.investmentAnalytics.investmentRating}
                </Badge>
              )}
            </div>

            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 ml-4"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(property);
              }}
            >
              Подробнее
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}