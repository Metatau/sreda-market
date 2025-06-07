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
  // Use real photo from ads-api.ru if available, otherwise fallback to placeholder
  if (property.images && property.images.length > 0) {
    return property.images[0];
  }
  
  // Fallback images based on property class
  const images = {
    "Эконом": "https://images.unsplash.com/photo-1631679706909-1844bbd07221?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Стандарт": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Комфорт": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Бизнес": "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
    "Элит": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
  };

  // For now use a simple fallback since propertyClass might not be available
  return images["Стандарт"];
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

  // Use propertyType from the API data
  const propertyClassName = property.propertyType || "Квартира";
  const colorClass = propertyClassColors["Стандарт"]; // Default styling

  // Extract analytics from the available data structure
  const pricePerSqm = property.pricePerSqm || (property.price && property.area ? Math.round(property.price / parseFloat(property.area || "50")) : null);
  const roi = null; // Will be calculated when analytics are loaded
  const liquidityScore = null;
  const priceGrowthRate = null;
  const investmentRating = null;

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
        <h3 className="text-gray-900 mb-2 line-clamp-2 font-normal h-12 leading-6">{property.title}</h3>

        {/* Description - 2 lines */}
        <div className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {property.description || `${property.rooms ? `${property.rooms} комнаты` : 'Квартира'}, ${property.area ? `${property.area} м²` : ''}.`}
        </div>

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
          <div className="flex items-center space-x-6">
            {pricePerSqm && (
              <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                <Square className="w-3 h-3 mr-1" />
                {Math.round(pricePerSqm).toLocaleString('ru-RU')} ₽/м²
              </div>
            )}
            {property.rooms && (
              <div className="flex items-center bg-gray-50 text-gray-700 px-2 py-1 rounded text-xs">
                <Bed className="w-3 h-3 mr-1" />
                {property.rooms} комн.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4"></div>

            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
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