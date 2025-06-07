import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Star, Building2 } from "lucide-react";
import { PropertyWithRelations } from "@/types";

interface PropertyCardProps {
  property: PropertyWithRelations;
  onSelect?: (property: PropertyWithRelations) => void;
}

export function PropertyCard({ property, onSelect }: PropertyCardProps) {
  const handleClick = () => {
    onSelect?.(property);
  };

  // Extract property class name for badge
  const propertyClassName = property.propertyClass?.name || "Стандарт";
  
  // Calculate price per sqm if not available
  const pricePerSqm = property.pricePerSqm || (property.price && property.area ? 
    Math.round(property.price / parseFloat(property.area || "50")) : null);

  // Функция для получения рейтинга инвестиций
  const getInvestmentRating = () => {
    const ratings = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
    return ratings[property.id % ratings.length];
  };

  // Функция для получения типа недвижимости
  const getPropertyType = () => {
    if (property.marketType === 'new_construction') return 'Новостройка';
    if (property.marketType === 'secondary') return 'Вторичка';
    return 'Вторичка'; // По умолчанию
  };

  // Функция для получения цвета рейтинга
  const getRatingColor = (rating: string) => {
    if (rating.startsWith('A')) return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700';
    if (rating.startsWith('B')) return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-md hover:shadow-lg hover:from-yellow-600 hover:to-amber-700';
    if (rating.startsWith('C')) return 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md hover:shadow-lg hover:from-orange-600 hover:to-red-600';
    return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700';
  };

  // Функция для получения цвета типа недвижимости
  const getPropertyTypeColor = (type: string) => {
    if (type === 'Новостройка') return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700';
    if (type === 'Вторичка') return 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-md hover:shadow-lg hover:from-purple-600 hover:to-violet-700';
    return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700';
  };

  const rating = getInvestmentRating();
  const propertyType = getPropertyType();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-[16px] font-normal">{property.title}</h3>
            <p className="text-sm text-gray-600 truncate">{property.address}</p>
            <p className="text-sm text-gray-500">
              {property.region?.name} • {propertyClassName}
            </p>
          </div>
        </div>

        {/* Теги рейтинга и типа недвижимости */}
        <div className="flex gap-2 mb-4">
          <Badge 
            className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 transition-all duration-300 transform hover:scale-105 ${getRatingColor(rating)}`}
          >
            <Star className="w-3 h-3 mr-1 drop-shadow-sm" />
            <span className="font-semibold">{rating}</span>
          </Badge>
          <Badge 
            className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 transition-all duration-300 transform hover:scale-105 ${getPropertyTypeColor(propertyType)}`}
          >
            <Building2 className="w-3 h-3 mr-1 drop-shadow-sm" />
            <span className="font-semibold">{propertyType}</span>
          </Badge>
        </div>

        <div className="mb-4">
          <div className="font-bold text-gray-900 text-[24px]">
            {property.price.toLocaleString('ru-RU')} ₽
          </div>
          {pricePerSqm && (
            <div className="text-sm text-gray-600">
              {pricePerSqm.toLocaleString('ru-RU')} ₽/м²
            </div>
          )}
        </div>

        <Button 
          onClick={handleClick}
          className="w-full"
          variant="outline"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Рассчитать аналитику
        </Button>
      </CardContent>
    </Card>
  );
}