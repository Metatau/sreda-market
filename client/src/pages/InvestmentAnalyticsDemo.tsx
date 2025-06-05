import React, { useState } from 'react';
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProperties } from "@/hooks/useProperties";
import { useInvestmentAnalytics, useCalculateInvestmentAnalytics } from "@/hooks/useInvestmentAnalytics";
import { PropertyPreviewCard } from "@/components/PropertyPreviewCard";
import { InvestmentAnalyticsModal } from "@/components/InvestmentAnalyticsModal";
import { PropertyFilters } from "@/components/PropertyFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, TrendingUp, Home, BarChart3 } from "lucide-react";
import type { SearchFilters } from "@/types";

interface Property {
  id: number;
  title: string;
  address: string;
  price: number;
  pricePerSqm?: number;
  area?: string;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  propertyType?: string;
  district?: string;
  metroStation?: string;
  url?: string;
  phone?: string;
  region?: {
    id: number;
    name: string;
  };
  propertyClass?: {
    id: number;
    name: string;
  };
}

export default function InvestmentAnalyticsDemo() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<string>("date_desc");

  const { data: propertiesData, isLoading: isLoadingProperties } = useProperties(filters);
  const calculateAnalytics = useCalculateInvestmentAnalytics();

  const properties = propertiesData?.properties || [];

  // Сортировка объектов
  const sortedProperties = [...properties].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price;
      case 'price_desc':
        return b.price - a.price;
      case 'date_desc':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'area':
        const aArea = parseFloat(a.area?.replace(/[^\d.]/g, '') || '0');
        const bArea = parseFloat(b.area?.replace(/[^\d.]/g, '') || '0');
        return bArea - aArea;
      case 'roi_desc':
        return (parseFloat(b.analytics?.roi?.toString() || '0')) - (parseFloat(a.analytics?.roi?.toString() || '0'));
      case 'investment_score':
        return (b.investmentAnalytics?.liquidityScore || 0) - (a.investmentAnalytics?.liquidityScore || 0);
      default:
        return 0;
    }
  });

  const handleCalculateAnalytics = async (property: Property) => {
    try {
      const analytics = await calculateAnalytics.mutateAsync(property.id);
      setSelectedProperty(property);
      setSelectedAnalytics(analytics);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
    }
  };

  const AnalyticsCard = ({ property }: { property: Property }) => {
    const { data: analytics, isLoading } = useInvestmentAnalytics(property.id);

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{property.title}</h3>
              <p className="text-sm text-gray-600 truncate">{property.address}</p>
              <p className="text-sm text-gray-500">
                {property.region?.name} • {property.propertyClass?.name}
              </p>
            </div>
            {analytics?.investmentRating && (
              <Badge variant="secondary" className="ml-2">
                {analytics.investmentRating}
              </Badge>
            )}
          </div>

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

          {analytics ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-xs text-gray-600">Аренда</div>
                  <div className="font-semibold text-green-600">
                    {analytics.rentalYield || '0'}%
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-xs text-gray-600">Флип</div>
                  <div className="font-semibold text-blue-600">
                    {analytics.flipRoi || '0'}%
                  </div>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <div className="text-xs text-gray-600">Прогноз</div>
                  <div className="font-semibold text-purple-600">
                    +{analytics.priceForecast3y || '0'}%
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={() => {
                  setSelectedProperty(property);
                  setSelectedAnalytics(analytics);
                  setIsModalOpen(true);
                }}
                className="w-full"
                size="sm"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Подробная аналитика
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Загрузка аналитики...</span>
            </div>
          ) : (
            <Button 
              onClick={() => handleCalculateAnalytics(property)}
              disabled={calculateAnalytics.isPending}
              className="w-full"
              variant="outline"
            >
              {calculateAnalytics.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Расчет...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Рассчитать аналитику
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoadingProperties) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка объектов недвижимости...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="font-bold text-gray-900 mb-2 text-[24px] text-center">
            Система инвестиционной аналитики SREDA Market
          </h1>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Home className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-gray-900">{sortedProperties.length}</div>
              <div className="text-sm text-gray-600">Объектов в базе</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-gray-900">8.2%</div>
              <div className="text-sm text-gray-600">Средняя доходность</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Calculator className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-gray-900">15</div>
              <div className="text-sm text-gray-600">Метрик анализа</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-gray-900">3</div>
              <div className="text-sm text-gray-600">Сценария инвестиций</div>
            </CardContent>
          </Card>
        </div>

        {/* Описание функций */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="w-5 h-5 mr-2 text-green-600" />
                Сценарий аренды
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Анализ доходности от сдачи в аренду с учетом всех расходов
              </p>
              <ul className="text-xs space-y-1 text-gray-500">
                <li>• Ежемесячный доход от аренды</li>
                <li>• Налоги и управляющие расходы</li>
                <li>• Срок окупаемости инвестиций</li>
                <li>• ROI с учетом всех затрат</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Сценарий флиппинга
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Расчет прибыли от ремонта и перепродажи объекта
              </p>
              <ul className="text-xs space-y-1 text-gray-500">
                <li>• Стоимость ремонта по классам</li>
                <li>• Потенциальный рост стоимости</li>
                <li>• Риелторские и налоговые расходы</li>
                <li>• Время реализации проекта</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Долгосрочный прогноз
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Анализ перспектив роста стоимости на 3 года
              </p>
              <ul className="text-xs space-y-1 text-gray-500">
                <li>• Влияние инфраструктурных проектов</li>
                <li>• Региональные тренды развития</li>
                <li>• Риски новой застройки</li>
                <li>• Индекс сохранности капитала</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Заголовок секции с контролами */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Объекты недвижимости</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Найдено {sortedProperties.length} объектов
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">По цене: сначала дешевые</SelectItem>
                <SelectItem value="price_desc">По цене: сначала дорогие</SelectItem>
                <SelectItem value="date_desc">По дате: сначала новые</SelectItem>
                <SelectItem value="area">По площади</SelectItem>
                <SelectItem value="roi_desc">По доходности</SelectItem>
                <SelectItem value="investment_score">По рейтингу инвестиций</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Основной контент с фильтрами и объектами */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Боковая панель с фильтрами */}
          <div className="lg:col-span-1">
            <PropertyFilters 
              filters={filters} 
              onFiltersChange={setFilters}
            />
          </div>

          {/* Список объектов с аналитикой */}
          <div className="lg:col-span-3">
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedProperties.slice(0, 12).map((property) => (
                <AnalyticsCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </div>

        {/* Модальное окно с детальной аналитикой */}
        {selectedProperty && selectedAnalytics && (
          <InvestmentAnalyticsModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedProperty(null);
              setSelectedAnalytics(null);
            }}
            property={selectedProperty}
            analytics={selectedAnalytics}
          />
        )}
      </div>
    </div>
  );
}