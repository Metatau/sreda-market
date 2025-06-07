import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PropertyWithRelations } from "@/types";

interface PropertyCardProps {
  property: PropertyWithRelations;
  onSelect?: (property: PropertyWithRelations) => void;
  onFavorite?: (propertyId: number) => void;
  isFavorite?: boolean;
}

export function PropertyCard({ property, onSelect, onFavorite, isFavorite = false }: PropertyCardProps) {
  const getPropertyClassColor = (className?: string) => {
    const colors = {
      "Эконом": "bg-blue-100 text-blue-700",
      "Стандарт": "bg-green-100 text-green-700",
      "Комфорт": "bg-yellow-100 text-yellow-700",
      "Бизнес": "bg-purple-100 text-purple-700",
      "Элит": "bg-orange-100 text-orange-700",
    };
    return colors[className as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M ₽`;
    }
    return `${price.toLocaleString()} ₽`;
  };

  const getRoiColor = (roi?: number) => {
    if (!roi) return "text-gray-500";
    if (roi >= 10) return "text-green-600";
    if (roi >= 7) return "text-yellow-600";
    return "text-red-600";
  };

  const getLiquidityColor = (score?: number) => {
    if (!score) return "text-gray-500";
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card 
      className="property-card cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      onClick={() => onSelect?.(property)}
    >
      <div className="relative">
        {/* Property Image */}
        <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
          <img
            src={property.imageUrl || `/api/properties/${property.id}/image`}
            alt={property.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `/api/images/property-default-${(property.id % 4) + 1}.jpg`;
            }}
          />
        </div>
        
        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.(property.id);
          }}
        >
          <i className={`fas fa-heart ${isFavorite ? "text-red-500" : "text-gray-400"}`}></i>
        </Button>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {property.title}
        </h3>

        <div className="flex items-center text-sm text-gray-600 mb-3">
          <i className="fas fa-map-marker-alt mr-1"></i>
          <span className="truncate">{property.address}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-gray-900">
            {formatPrice(property.price)}
          </div>
          {property.pricePerSqm && (
            <div className="text-sm text-gray-500">
              {property.pricePerSqm.toLocaleString()} ₽/м²
            </div>
          )}
        </div>

        {/* Компактная строка с основными характеристиками */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <div className="flex items-center space-x-3">
            {property.area && (
              <span className="flex items-center">
                <i className="fas fa-expand-arrows-alt mr-1"></i>
                {property.area} м²
              </span>
            )}
            {property.rooms && (
              <span className="flex items-center">
                <i className="fas fa-door-open mr-1"></i>
                {property.rooms === 0 ? "Студия" : `${property.rooms}`}
              </span>
            )}
            {property.floor && property.totalFloors && (
              <span className="flex items-center">
                <i className="fas fa-building mr-1"></i>
                {property.floor}/{property.totalFloors}
              </span>
            )}
          </div>
          
          {/* Компактный бейдж с классом недвижимости */}
          {property.propertyClassId && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Класс {property.propertyClassId}
            </Badge>
          )}
        </div>

        {/* Investment Metrics */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            {property.investmentAnalytics?.rentalRoiAnnual && (
              <div className="flex items-center space-x-1">
                <i className="fas fa-chart-line text-green-600"></i>
                <span className="text-xs text-gray-600">ROI:</span>
                <span className={`text-xs font-semibold ${getRoiColor(Number(property.investmentAnalytics.rentalRoiAnnual))}`}>
                  {parseFloat(property.investmentAnalytics.rentalRoiAnnual).toFixed(1)}%
                </span>
              </div>
            )}
            {property.investmentAnalytics?.liquidityScore && (
              <div className="flex items-center space-x-1">
                <i className="fas fa-tachometer-alt text-orange-600"></i>
                <span className="text-xs text-gray-600">Ликв:</span>
                <span className={`text-xs font-semibold ${getLiquidityColor(property.investmentAnalytics.liquidityScore)}`}>
                  {property.investmentAnalytics.liquidityScore}/10
                </span>
              </div>
            )}
          </div>
          
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            Подробнее
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
