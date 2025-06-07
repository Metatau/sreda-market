import { useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyCard } from "@/components/PropertyCard";
import { Footer } from "@/components/Footer";

import { InvestmentAnalyticsModal } from "@/components/InvestmentAnalyticsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProperties, useRegions } from "@/hooks/useProperties";
import { useNewProperties } from "@/hooks/useNewProperties";
import { useInvestmentAnalytics, useCalculateInvestmentAnalytics } from "@/hooks/useInvestmentAnalytics";
import { TrendingUp, BarChart3, Building2, Clock, Map, Grid3x3, Layers } from "lucide-react";
import type { SearchFilters, Property, PropertyWithRelations } from "@/types";

// Enhanced Map Components
import { PropertyMap } from "@/components/Map/PropertyMapRefactored";
import { MapAnalyticsDemo } from "@/components/Map/MapAnalyticsDemo";

export default function Home() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("moscow");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Enhanced Map Analytics State
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const { data: regions = [] } = useRegions();
  const { data: propertiesData, isLoading } = useProperties(filters, currentPage, 9);
  const { data: newPropertiesData, isLoading: isLoadingNewProperties } = useNewProperties();
  const { data: analyticsData } = useInvestmentAnalytics(selectedProperty?.id || 0);
  const calculateAnalytics = useCalculateInvestmentAnalytics();

  const properties = propertiesData?.properties || [];
  const pagination = propertiesData?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, query: searchQuery });
    setCurrentPage(1);
  };

  const handlePropertySelect = async (property: PropertyWithRelations | Property) => {
    console.log('Property selected:', property.id);
    setSelectedProperty(property as Property);
    setIsAnalyticsModalOpen(true);
    
    // Calculate analytics if not available
    if (!analyticsData) {
      try {
        console.log('Calculating analytics for property:', property.id);
        await calculateAnalytics.mutateAsync(property.id);
      } catch (error) {
        console.error('Failed to calculate analytics:', error);
      }
    }
  };

  // Динамически определяем название региона на основе фильтров с правильными падежами
  const getRegionNameInPrepositionalCase = (regionName: string) => {
    const prepositionalCases: Record<string, string> = {
      "Москва": "Москве",
      "Санкт-Петербург": "Санкт-Петербурге", 
      "Екатеринбург": "Екатеринбурге",
      "Новосибирск": "Новосибирске",
      "Нижний Новгород": "Нижнем Новгороде",
      "Казань": "Казани",
      "Челябинск": "Челябинске",
      "Омск": "Омске",
      "Самара": "Самаре",
      "Ростов-на-Дону": "Ростове-на-Дону",
      "Уфа": "Уфе",
      "Красноярск": "Красноярске",
      "Пермь": "Перми",
      "Воронеж": "Воронеже",
      "Волгоград": "Волгограде",
      "Краснодар": "Краснодаре",
      "Саратов": "Саратове",
      "Тюмень": "Тюмени",
      "Тольятти": "Тольятти",
      "Ижевск": "Ижевске"
    };
    
    return prepositionalCases[regionName] || regionName;
  };

  const selectedRegionName = filters.regionId 
    ? getRegionNameInPrepositionalCase(regions.find(r => r.id === filters.regionId)?.name || "выбранном регионе")
    : "России";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />

      {/* DEBUG: Test if content is visible */}
      <div className="w-full bg-red-500 text-white text-center py-2 text-lg font-bold">
        🔍 ОТЛАДКА: Если вы видите эту красную полосу, значит контент загружается правильно
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <PropertyFilters 
              filters={filters} 
              onFiltersChange={setFilters}
            />
            
            {/* Analytics Overview Cards */}
            <div className="mt-6 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Средняя доходность</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12.4%</div>
                  <p className="text-xs text-muted-foreground">
                    +2.1% к прошлому месяцу
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Рыночный тренд</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">↗ Рост</div>
                  <p className="text-xs text-muted-foreground">
                    Рынок показывает стабильный рост
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Новые объекты</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoadingNewProperties ? "..." : newPropertiesData?.count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    За последние 24 часа
                    {newPropertiesData?.timestamp && (
                      <span className="block mt-1 text-green-600">
                        ● Обновлено {new Date(newPropertiesData.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Enhanced View Mode Tabs - VISIBLE */}
            <div className="mb-6 border-2 border-blue-500 p-4 bg-blue-50">
              <div className="text-xs text-blue-600 mb-2">DEBUG: Переключатели должны быть здесь</div>
              <div className="flex bg-gray-100 rounded-lg p-1 w-fit mb-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm border-blue-500' 
                      : 'text-gray-600 hover:text-gray-900 border-gray-300'
                  }`}
                >
                  <Grid3x3 className="h-4 w-4" />
                  Список объектов
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ml-1 ${
                    viewMode === 'map' 
                      ? 'bg-white text-gray-900 shadow-sm border-blue-500' 
                      : 'text-gray-600 hover:text-gray-900 border-gray-300'
                  }`}
                >
                  <Map className="h-4 w-4" />
                  Аналитическая карта
                  <Badge variant="secondary" className="ml-1">Новинка</Badge>
                </button>
              </div>
              <div className="text-xs text-gray-500">Текущий режим: {viewMode}</div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 text-[20px]">
                  Недвижимость в {selectedRegionName}
                </h2>
                
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-600">
                    Найдено {pagination?.total || 0} объектов
                  </p>
                  <Select defaultValue="price_asc">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Сортировка" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_asc">По цене: сначала дешевые</SelectItem>
                      <SelectItem value="price_desc">По цене: сначала дорогие</SelectItem>
                      <SelectItem value="date_desc">По дате: сначала новые</SelectItem>
                      <SelectItem value="area">По площади</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'grid' ? (
              <div className="mt-6">
                {/* Property Grid */}
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-40 bg-gray-200 rounded mb-4"></div>
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onSelect={handlePropertySelect}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {pagination && pagination.pages && pagination.pages > 1 && (
                  <div className="flex justify-center space-x-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Назад
                    </Button>
                    
                    <span className="flex items-center px-3 text-sm text-gray-600">
                      {currentPage} из {pagination.pages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(pagination.pages || 1, currentPage + 1))}
                      disabled={currentPage === pagination.pages}
                    >
                      Далее
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Enhanced Map Analytics View */
              <div className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Map - Using existing PropertyMap component */}
                  <div className="lg:col-span-3">
                    <div className="relative h-[600px] rounded-lg border shadow-lg overflow-hidden">
                      <PropertyMap 
                        properties={properties as any}
                        selectedProperty={selectedProperty}
                        onPropertySelect={(property: any) => setSelectedProperty(property as Property)}
                      />
                      
                      {/* Enhanced Analytics Overlay */}
                      <div className="absolute top-4 left-4 z-10">
                        <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Layers className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Аналитическая карта активна</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Отображено {properties.length} объектов
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                  
                  {/* Demo Panel */}
                  <div className="lg:col-span-1">
                    <MapAnalyticsDemo />
                  </div>
                </div>

                {/* Map Analytics Features Info */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Тепловые карты</h4>
                          <p className="text-sm text-gray-600">10+ режимов аналитики</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Map className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Геоанализ</h4>
                          <p className="text-sm text-gray-600">Измерения и статистика</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Инвест-аналитика</h4>
                          <p className="text-sm text-gray-600">ROI и прогнозы</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Investment Analytics Modal */}
      {selectedProperty && (
        <InvestmentAnalyticsModal
          isOpen={isAnalyticsModalOpen}
          onClose={() => {
            setIsAnalyticsModalOpen(false);
            setSelectedProperty(null);
          }}
          property={selectedProperty}
          analytics={analyticsData || {}}
        />
      )}

      <Footer />
    </div>
  );
}