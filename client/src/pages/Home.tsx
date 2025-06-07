import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyFilters } from '@/components/PropertyFilters';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { PropertyMap } from '@/components/Map/PropertyMapRefactored';
import { InvestmentAnalyticsModal } from '@/components/InvestmentAnalyticsModal';
import { useProperties, useAllProperties, useRegions } from '@/hooks/useProperties';
import { useNewProperties } from '@/hooks/useNewProperties';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Property, PropertyFilters as FilterType, InvestmentAnalytics } from '@/types';
import { TrendingUp, BarChart3, Clock, MapPin } from 'lucide-react';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterType>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<InvestmentAnalytics | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [activeMapTool, setActiveMapTool] = useState<'none' | 'heatmap' | 'geoanalysis' | 'investment'>('none');

  const queryClient = useQueryClient();
  const { data: regions = [] } = useRegions();
  const { data: propertiesData, isLoading } = useProperties(filters, currentPage, 9);
  const { data: allPropertiesData, isLoading: isLoadingAllProperties } = useAllProperties(); // Все объекты для карты
  const { data: newPropertiesData, isLoading: isLoadingNewProperties } = useNewProperties();

  const properties = propertiesData?.properties || [];
  const allProperties = allPropertiesData?.properties || []; // Все объекты для карты
  const pagination = propertiesData?.pagination;



  const calculateAnalytics = useMutation({
    mutationFn: async (propertyId: number): Promise<InvestmentAnalytics> => {
      const response = await fetch(`/api/investment-analytics/${propertyId}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to calculate analytics');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/investment-analytics'] });
    },
  });

  const handlePropertySelect = async (property: Property) => {
    try {
      setSelectedProperty(property);
      const analytics = await calculateAnalytics.mutateAsync(property.id);
      setSelectedAnalytics(analytics);
      setIsAnalyticsModalOpen(true);
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
      // Still open modal but without analytics data
      setSelectedAnalytics(null);
      setIsAnalyticsModalOpen(true);
    }
  };

  const handleFilterChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Map Section - Full Width Always Active */}
      <div className="w-full pt-4 px-4">
        <div className="relative h-[500px] bg-white border-b rounded-lg shadow-sm">
          <PropertyMap 
            properties={allProperties as any}
            selectedProperty={selectedProperty}
            onPropertySelect={(property: any) => setSelectedProperty(property as Property)}
            regionId={filters.regionId}
            activeMapTool={activeMapTool}
          />

        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">

            
            <PropertyFilters 
              filters={filters} 
              onFiltersChange={handleFilterChange}
            />
            
            {/* Analytics Overview Cards */}
            <div className="mt-8 space-y-4">
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
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">


            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-between">
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

            {/* Property Grid */}
            <div className="mt-6">
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
                  {properties.map((property: any) => (
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
          </div>
        </div>
      </div>

      {/* Map Analytics Tools */}
      <div className="w-full bg-white border-b shadow-sm mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className={`hover:shadow-md transition-all cursor-pointer ${
                activeMapTool === 'heatmap' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setActiveMapTool(activeMapTool === 'heatmap' ? 'none' : 'heatmap')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    activeMapTool === 'heatmap' ? 'bg-blue-600' : 'bg-blue-100'
                  }`}>
                    <BarChart3 className={`h-6 w-6 ${
                      activeMapTool === 'heatmap' ? 'text-white' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Тепловые карты</h4>
                    <p className="text-sm text-gray-600">Анализ цены, плотности, инвестиций</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`hover:shadow-md transition-all cursor-pointer ${
                activeMapTool === 'geoanalysis' ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
              onClick={() => setActiveMapTool(activeMapTool === 'geoanalysis' ? 'none' : 'geoanalysis')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    activeMapTool === 'geoanalysis' ? 'bg-green-600' : 'bg-green-100'
                  }`}>
                    <MapPin className={`h-6 w-6 ${
                      activeMapTool === 'geoanalysis' ? 'text-white' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Геоанализ</h4>
                    <p className="text-sm text-gray-600">Измерения и региональная статистика</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`hover:shadow-md transition-all cursor-pointer ${
                activeMapTool === 'investment' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
              }`}
              onClick={() => setActiveMapTool(activeMapTool === 'investment' ? 'none' : 'investment')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    activeMapTool === 'investment' ? 'bg-orange-600' : 'bg-orange-100'
                  }`}>
                    <TrendingUp className={`h-6 w-6 ${
                      activeMapTool === 'investment' ? 'text-white' : 'text-orange-600'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">Инвест-аналитика</h4>
                    <p className="text-sm text-gray-600">ROI, доходность и прогнозы</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Active Tool Panel */}
      {activeMapTool !== 'none' && (
        <div className="w-full bg-gray-50 border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {activeMapTool === 'heatmap' && (
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="font-semibold mb-3 text-blue-600">Настройки тепловых карт</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Тип карты</label>
                    <select className="w-full border rounded-md px-3 py-2">
                      <option>Карта цен</option>
                      <option>Плотность объектов</option>
                      <option>Инвестиционная привлекательность</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Интенсивность</label>
                    <input type="range" min="0.1" max="2" step="0.1" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Радиус</label>
                    <input type="range" min="100" max="1000" step="50" className="w-full" />
                  </div>
                </div>
              </div>
            )}
            
            {activeMapTool === 'geoanalysis' && (
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="font-semibold mb-3 text-green-600">Инструменты геоанализа</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button className="border rounded-lg p-3 text-center hover:bg-gray-50">
                    <div className="text-lg mb-1">📏</div>
                    <div className="text-sm">Измерить расстояние</div>
                  </button>
                  <button className="border rounded-lg p-3 text-center hover:bg-gray-50">
                    <div className="text-lg mb-1">🎯</div>
                    <div className="text-sm">Радиус от точки</div>
                  </button>
                  <button className="border rounded-lg p-3 text-center hover:bg-gray-50">
                    <div className="text-lg mb-1">📊</div>
                    <div className="text-sm">Статистика района</div>
                  </button>
                  <button className="border rounded-lg p-3 text-center hover:bg-gray-50">
                    <div className="text-lg mb-1">🏢</div>
                    <div className="text-sm">Инфраструктура</div>
                  </button>
                </div>
              </div>
            )}
            
            {activeMapTool === 'investment' && (
              <div className="bg-white rounded-lg p-4 border">
                <h3 className="font-semibold mb-3 text-orange-600">Инвестиционная аналитика</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">ROI-зоны</span>
                      <input type="checkbox" />
                    </div>
                    <div className="text-xs text-gray-600">Показать зоны доходности</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Прогноз роста</span>
                      <input type="checkbox" />
                    </div>
                    <div className="text-xs text-gray-600">Потенциал роста цен</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Ликвидность</span>
                      <input type="checkbox" />
                    </div>
                    <div className="text-xs text-gray-600">Скорость продажи</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investment Analytics Modal */}
      {selectedProperty && (
        <InvestmentAnalyticsModal
          isOpen={isAnalyticsModalOpen}
          onClose={() => {
            setIsAnalyticsModalOpen(false);
            setSelectedProperty(null);
            setSelectedAnalytics(null);
          }}
          property={selectedProperty as any}
          analytics={selectedAnalytics || {}}
        />
      )}

      <Footer />
    </div>
  );
}