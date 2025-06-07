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
import { useProperties, useRegions } from '@/hooks/useProperties';
import { useNewProperties } from '@/hooks/useNewProperties';
import type { Property, PropertyFilters as FilterType } from '@/types';
import { TrendingUp, BarChart3, Clock, Grid3X3, Map, Layers } from 'lucide-react';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterType>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const { data: regions = [] } = useRegions();
  const { data: propertiesData, isLoading } = useProperties(filters, currentPage, 9);
  const { data: newPropertiesData, isLoading: isLoadingNewProperties } = useNewProperties();

  const properties = propertiesData?.properties || [];
  const pagination = propertiesData?.pagination;
  const analyticsData = null;

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setIsAnalyticsModalOpen(true);
  };

  const handleFilterChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Map Section - Full Width Always Active */}
      <div className="w-full">
        <div className="relative h-[500px] bg-white border-b">
          <PropertyMap 
            properties={properties as any}
            selectedProperty={selectedProperty}
            onPropertySelect={(property: any) => setSelectedProperty(property as Property)}
          />
          
          {/* Map Overlay Info */}
          <div className="absolute top-4 left-4 z-10">
            <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Интерактивная карта недвижимости</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Отображено {properties.length} объектов
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Map Analytics Tools */}
      <div className="w-full bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Тепловые карты</h4>
                    <p className="text-sm text-gray-600">Анализ цены, плотности, инвестиций</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Map className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Геоанализ</h4>
                    <p className="text-sm text-gray-600">Измерения и региональная статистика</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
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
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Недвижимость России
              </h1>
              <p className="text-gray-600">
                Найдите идеальную недвижимость с помощью ИИ-аналитики и интерактивной карты
              </p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="flex items-center gap-2"
                    >
                      <Grid3X3 className="h-4 w-4" />
                      Список объектов
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="flex items-center gap-2 opacity-75"
                    >
                      <Map className="h-4 w-4" />
                      Карта активна
                    </Button>
                  </div>
                </div>
                
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

      {/* Investment Analytics Modal */}
      {selectedProperty && (
        <InvestmentAnalyticsModal
          isOpen={isAnalyticsModalOpen}
          onClose={() => {
            setIsAnalyticsModalOpen(false);
            setSelectedProperty(null);
          }}
          property={selectedProperty as any}
          analytics={analyticsData || {}}
        />
      )}

      <Footer />
    </div>
  );
}