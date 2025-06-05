import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyCard } from "@/components/PropertyCard";
import { AIChat } from "@/components/AIChat";
import { InvestmentAnalyticsModal } from "@/components/InvestmentAnalyticsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProperties, useRegions } from "@/hooks/useProperties";
import { useNewProperties } from "@/hooks/useNewProperties";
import { useInvestmentAnalytics, useCalculateInvestmentAnalytics } from "@/hooks/useInvestmentAnalytics";
import { TrendingUp, BarChart3, Building2, Clock } from "lucide-react";
import type { SearchFilters, Property } from "@/types";

export default function Home() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("moscow");
  const [currentPage, setCurrentPage] = useState(1);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

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

  const handlePropertySelect = async (property: Property) => {
    console.log('Property selected:', property.id);
    setSelectedProperty(property);
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-building text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Поиск недвижимости</h1>
                <p className="text-xs text-gray-500">ИИ-сервис недвижимости</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <Input
                  type="text"
                  placeholder="Поиск по адресу, району или названию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
              </form>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <i className="fas fa-heart text-gray-600"></i>
              </Button>
              <Button variant="ghost" size="sm">
                <i className="fas fa-bell text-gray-600"></i>
              </Button>
              <Button variant="ghost" size="sm">
                <i className="fas fa-user text-gray-600"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>
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


            {/* Property Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-gray-900 text-[20px]">
                  Недвижимость в {selectedRegionName}
                </h2>
                <p className="text-sm text-gray-600">
                  Найдено {pagination?.total || 0} объектов
                </p>
              </div>

              <div className="flex items-center space-x-4">
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
            {pagination && pagination.totalPages > 1 && (
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
                  {currentPage} из {pagination.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                >
                  Далее
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* AI Chat */}
      <AIChat 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />
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
    </div>
  );
}