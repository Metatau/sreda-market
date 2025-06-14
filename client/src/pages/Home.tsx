import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyFilters } from '@/components/PropertyFilters';
import { Navigation } from '@/components/Navigation';

import { PropertyMap } from '@/components/Map/PropertyMapFixed';
import { InvestmentAnalyticsModal } from '@/components/InvestmentAnalyticsModal';

import { useProperties, useAllProperties, useRegions } from '@/hooks/useProperties';
import { useNewProperties } from '@/hooks/useNewProperties';
import { usePropertyAnalytics } from '@/hooks/usePropertyAnalytics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Property, PropertyFilters as FilterType, InvestmentAnalytics } from '@/types';
import { TrendingUp, BarChart3, Clock, MapPin, Filter } from 'lucide-react';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterType>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<InvestmentAnalytics | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [activeMapTool, setActiveMapTool] = useState<'none' | 'heatmap' | 'geoanalysis' | 'investment'>('none');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: regions = [] } = useRegions();
  const { data: propertiesData, isLoading } = useProperties(filters, currentPage, 9);
  const { data: allPropertiesData, isLoading: isLoadingAllProperties } = useAllProperties(); // Все объекты для карты
  const { data: newPropertiesData, isLoading: isLoadingNewProperties } = useNewProperties();

  const properties = propertiesData?.properties || [];
  const allProperties = allPropertiesData?.properties || []; // Все объекты для карты
  const pagination = propertiesData?.pagination;

  // Загружаем аналитику для текущих объектов
  const propertyIds = properties.map(p => p.id);
  const { data: analyticsData } = usePropertyAnalytics(propertyIds);





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
      
      const result = await response.json();
      return result.data || result; // Handle both wrapped and unwrapped responses
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
    console.log('Filter change detected:', newFilters);
    setFilters(newFilters);
    setCurrentPage(1);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex-none">
        <Navigation />
      </div>
      {/* Fixed Top Section */}
      <div className="flex-none">
        {/* Map Analytics Tools */}
        <div className="w-full bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card 
                className={`hover:shadow-md transition-all cursor-pointer ${
                  activeMapTool === 'heatmap' ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => setActiveMapTool(activeMapTool === 'heatmap' ? 'none' : 'heatmap')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      activeMapTool === 'heatmap' ? 'bg-blue-600 shadow-md' : 'bg-blue-100'
                    }`}>
                      <BarChart3 className={`h-5 w-5 transition-colors ${
                        activeMapTool === 'heatmap' ? 'text-white' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm transition-colors ${
                        activeMapTool === 'heatmap' ? 'text-blue-700' : 'text-gray-900'
                      }`}>Тепловая карта{activeMapTool === 'heatmap' && <span className="ml-2 text-blue-600">●</span>}
                      </h4>
                      <p className="text-xs text-gray-600">Карта цен</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`hover:shadow-md transition-all cursor-pointer ${
                  activeMapTool === 'geoanalysis' ? 'ring-2 ring-green-500 bg-green-50 shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => setActiveMapTool(activeMapTool === 'geoanalysis' ? 'none' : 'geoanalysis')}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      activeMapTool === 'geoanalysis' ? 'bg-green-600 shadow-md' : 'bg-green-100'
                    }`}>
                      <MapPin className={`h-5 w-5 transition-colors ${
                        activeMapTool === 'geoanalysis' ? 'text-white' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className={`font-semibold text-sm transition-colors ${
                        activeMapTool === 'geoanalysis' ? 'text-green-700' : 'text-gray-900'
                      }`}>Геоаналитика{activeMapTool === 'geoanalysis' && <span className="ml-2 text-green-600">●</span>}
                      </h4>
                      <p className="text-xs text-gray-600">Анализ районов с ИИ</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="w-full px-2 sm:px-4">
          <div className="relative h-[250px] sm:h-[300px] lg:h-[350px] bg-white border-b rounded-lg shadow-sm overflow-hidden">
            <PropertyMap 
              properties={properties as any}
              selectedProperty={selectedProperty}
              onPropertySelect={handlePropertySelect}
              regionId={filters.regionId}
              activeMapTool={activeMapTool}
            />
          </div>
        </div>
      </div>
      {/* Flexible Bottom Section */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4">
          <div className="h-full flex flex-col lg:grid lg:grid-cols-4 gap-4">
            {/* Mobile Filters Toggle */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="w-full mb-4"
              >
                <Filter className="h-4 w-4 mr-2" />
                Фильтры {mobileFiltersOpen ? '▲' : '▼'}
              </Button>
              
              {mobileFiltersOpen && (
                <div className="mb-4 bg-white rounded-lg border p-4 max-h-60 overflow-y-auto">
                  <PropertyFilters 
                    filters={filters} 
                    onFiltersChange={handleFilterChange}
                  />
                </div>
              )}
            </div>

            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block lg:col-span-1 overflow-hidden">
              <div className="h-full overflow-y-auto pr-2">
                <PropertyFilters 
                  filters={filters} 
                  onFiltersChange={handleFilterChange}
                />
                
                {/* Analytics Overview Cards - Hidden on mobile to save space */}
                <div className="mt-6 space-y-4 pb-4">
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
            </div>

            {/* Scrollable Properties Content */}
            <div className="flex-1 lg:col-span-3 overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Fixed Controls */}
                <div className="flex-none bg-white rounded-lg shadow-sm border p-2 sm:p-3 mb-2 sm:mb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                    <p className="text-xs sm:text-sm text-gray-600">
                      Найдено {pagination?.total || 0} объектов
                    </p>
                    <Select defaultValue="price_asc">
                      <SelectTrigger className="w-full sm:w-48 text-xs sm:text-sm">
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

                {/* Scrollable Property Grid */}
                <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
                  {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-2 sm:p-3 lg:p-4">
                            <div className="h-28 sm:h-32 lg:h-40 bg-gray-200 rounded mb-2 sm:mb-3 lg:mb-4"></div>
                            <div className="h-3 sm:h-4 bg-gray-200 rounded mb-1 sm:mb-2"></div>
                            <div className="h-2 sm:h-3 bg-gray-200 rounded w-2/3"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 pb-4">
                      {properties.map((property: any) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          onCalculateAnalytics={handlePropertySelect}
                          analytics={analyticsData?.[property.id]}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {pagination && pagination.pages && pagination.pages > 1 && (
                    <div className="flex justify-center space-x-1 sm:space-x-2 py-2 sm:py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        Назад
                      </Button>
                      
                      <span className="flex items-center px-2 sm:px-3 text-xs sm:text-sm text-gray-600">
                        {currentPage} из {pagination.pages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(pagination.pages || 1, currentPage + 1))}
                        disabled={currentPage === pagination.pages}
                        className="text-xs sm:text-sm px-2 sm:px-3"
                      >
                        Далее
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
            setSelectedAnalytics(null);
          }}
          property={selectedProperty as any}
        />
      )}
    </div>
  );
}