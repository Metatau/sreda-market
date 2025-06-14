import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Star, Building2, Home } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/favoritesApi';
import { useUser } from '@/contexts/UserContext';
import { PropertyWithRelations } from "@/types";

interface PropertyCardProps {
  property: PropertyWithRelations;
  onSelect?: (property: PropertyWithRelations) => void;
  onCalculateAnalytics?: (property: PropertyWithRelations) => void;
  analytics?: any; // Investment analytics data
}

export function PropertyCard({ property, onSelect, onCalculateAnalytics, analytics }: PropertyCardProps) {
  const { user, isAuthenticated } = useUser();
  const queryClient = useQueryClient();

  // Check if property is favorited
  const { data: isFavorited = false } = useQuery({
    queryKey: ['favorite', property.id],
    queryFn: () => favoritesApi.checkFavorite(property.id),
    enabled: isAuthenticated,
  });

  // Favorite toggle mutation
  const favoriteMutation = useMutation({
    mutationFn: async (shouldAdd: boolean) => {
      if (shouldAdd) {
        await favoritesApi.addToFavorites(property.id);
      } else {
        await favoritesApi.removeFromFavorites(property.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', property.id] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleClick = () => {
    onSelect?.(property);
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    favoriteMutation.mutate(!isFavorited);
  };

  const handleCalculateAnalytics = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCalculateAnalytics?.(property);
  };

  // Extract property class name for badge
  const propertyClassName = property.propertyClass?.name || "Стандарт";
  
  // Calculate price per sqm if not available
  const pricePerSqm = property.pricePerSqm || (property.price && property.area ? 
    Math.round(property.price / parseFloat(property.area || "50")) : null);

  // Функция для получения рейтинга инвестиций
  const getInvestmentRating = () => {
    // Используем реальную аналитику если доступна
    if (analytics?.investmentRating) {
      return analytics.investmentRating;
    }
    
    // Используем аналитику из свойства объекта если доступна
    if (property.analytics?.investmentRating) {
      return property.analytics.investmentRating;
    }
    
    // Возвращаем "Анализ" если данных нет
    return "Анализ";
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
    if (rating === 'Анализ') return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700';
    return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700';
  };

  // Функция для получения цвета типа недвижимости
  const getPropertyTypeColor = (type: string) => {
    if (type === 'Новостройка') return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700';
    if (type === 'Вторичка') return 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-md hover:shadow-lg hover:from-purple-600 hover:to-violet-700';
    return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md hover:shadow-lg hover:from-gray-600 hover:to-gray-700';
  };

  // Функция для получения цвета класса недвижимости
  const getPropertyClassColor = (className: string) => {
    if (className === 'Элит') return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md hover:shadow-lg hover:from-amber-600 hover:to-yellow-700';
    if (className === 'Бизнес') return 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700';
    if (className === 'Комфорт') return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-cyan-600 hover:to-blue-700';
    if (className === 'Эконом') return 'bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-md hover:shadow-lg hover:from-slate-600 hover:to-gray-700';
    return 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-purple-700';
  };

  const rating = getInvestmentRating();
  const propertyType = getPropertyType();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-sm sm:text-[16px] font-normal leading-tight">{property.title}</h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate mt-1">{property.address}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {property.region?.name}
            </p>
          </div>
        </div>

        {/* Теги рейтинга, типа и класса недвижимости */}
        <div className="flex gap-1 mb-3 sm:mb-4 overflow-hidden flex-wrap">
          <Badge 
            className={`text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded-full border-0 transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${getRatingColor(rating)}`}
          >
            <Star className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 drop-shadow-sm" />
            <span className="font-semibold">{rating}</span>
          </Badge>
          <Badge 
            className={`text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded-full border-0 transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${getPropertyTypeColor(propertyType)}`}
          >
            <Building2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 drop-shadow-sm" />
            <span className="font-semibold">{propertyType}</span>
          </Badge>
          <Badge 
            className={`text-[9px] sm:text-[10px] font-medium px-1 sm:px-1.5 py-0.5 rounded-full border-0 transition-all duration-300 transform hover:scale-105 whitespace-nowrap ${getPropertyClassColor(propertyClassName)}`}
          >
            <Home className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 drop-shadow-sm" />
            <span className="font-semibold">{propertyClassName}</span>
          </Badge>
        </div>

        <div className="mb-3 sm:mb-4">
          <div className="flex justify-between items-center">
            <div className="font-bold text-gray-900 text-lg sm:text-xl lg:text-[24px]">
              {property.price.toLocaleString('ru-RU')} ₽
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`p-2 h-10 w-10 hover:bg-gray-100 ${isFavorited ? 'text-yellow-500' : 'text-gray-400'}`}
              onClick={handleFavoriteToggle}
              disabled={!isAuthenticated || favoriteMutation.isPending}
            >
              <Star 
                className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`}
              />
            </Button>
          </div>
          {pricePerSqm && (
            <div className="text-sm text-gray-600">
              {pricePerSqm.toLocaleString('ru-RU')} ₽/м²
            </div>
          )}
        </div>

        <Button 
          onClick={handleCalculateAnalytics}
          className="w-full"
          variant="outline"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Подробнее
        </Button>
      </CardContent>
    </Card>
  );
}