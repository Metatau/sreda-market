import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMap } from "@/components/PropertyMap";
import { AIChat } from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useProperties, useRegions } from "@/hooks/useProperties";
import type { SearchFilters, Property } from "@/types";

export default function Home() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("moscow");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"map" | "list" | "analytics">("map");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const { data: regions = [] } = useRegions();
  const { data: propertiesData, isLoading } = useProperties(filters, currentPage, 20);

  const properties = propertiesData?.properties || [];
  const pagination = propertiesData?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setFilters({ ...filters, query: searchQuery });
    }
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    // In a real app, this would open a property detail modal or navigate to detail page
    console.log("Selected property:", property);
  };

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
                <h1 className="text-xl font-bold text-gray-900">SREDA Market</h1>
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
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <i className="fab fa-telegram-plane text-white text-sm"></i>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <PropertyFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Navigation Tabs */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Недвижимость {regions.find(r => r.id.toString() === selectedRegion)?.name || "в России"}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Найдено {pagination?.total || 0} объектов
                  </p>
                </div>

                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="map" className="flex items-center space-x-2">
                    <i className="fas fa-map"></i>
                    <span>Карта</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center space-x-2">
                    <i className="fas fa-list"></i>
                    <span>Список</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center space-x-2">
                    <i className="fas fa-chart-line"></i>
                    <span>Аналитика</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="map" className="space-y-6">
                <PropertyMap 
                  filters={{ regionId: filters.regionId, propertyClassId: filters.propertyClassId }}
                  onPropertySelect={handlePropertySelect}
                />
                
                {/* Property Results Below Map */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold">Результаты поиска</h3>
                      <Select defaultValue="price_asc">
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Сортировка" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price_asc">По цене: сначала дешевые</SelectItem>
                          <SelectItem value="price_desc">По цене: сначала дорогие</SelectItem>
                          <SelectItem value="date_desc">По дате: сначала новые</SelectItem>
                          <SelectItem value="area">По площади</SelectItem>
                          <SelectItem value="roi">По доходности</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </div>
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
                    {pagination && pagination.pages > 1 && (
                      <div className="flex items-center justify-between mt-8 pt-6 border-t">
                        <p className="text-sm text-gray-600">
                          Показано {((pagination.page - 1) * pagination.perPage) + 1}-{Math.min(pagination.page * pagination.perPage, pagination.total)} из {pagination.total} объектов
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasPrev}
                            onClick={() => setCurrentPage(currentPage - 1)}
                          >
                            Назад
                          </Button>
                          {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                            const page = i + 1;
                            return (
                              <Button
                                key={page}
                                variant={page === pagination.page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          })}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasNext}
                            onClick={() => setCurrentPage(currentPage + 1)}
                          >
                            Далее
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="list">
                <div className="space-y-4">
                  {isLoading ? (
                    <div>Загрузка...</div>
                  ) : (
                    properties.map((property) => (
                      <div key={property.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handlePropertySelect(property)}>
                        <div className="flex space-x-4">
                          <img 
                            src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
                            alt={property.title}
                            className="w-32 h-24 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">{property.title}</h4>
                                <p className="text-gray-600 mb-2">{property.address}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  {property.rooms && <span><i className="fas fa-bed mr-1"></i>{property.rooms} комн.</span>}
                                  {property.area && <span><i className="fas fa-ruler-combined mr-1"></i>{property.area} м²</span>}
                                  {property.floor && property.totalFloors && <span><i className="fas fa-building mr-1"></i>{property.floor}/{property.totalFloors} эт.</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900 mb-1">{property.price.toLocaleString()} ₽</div>
                                {property.pricePerSqm && <div className="text-sm text-gray-600">{property.pricePerSqm.toLocaleString()} ₽/м²</div>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Аналитика рынка</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <i className="fas fa-chart-line text-emerald-600 text-2xl mr-3"></i>
                          <div>
                            <div className="text-2xl font-bold text-emerald-900">+12.3%</div>
                            <div className="text-sm text-emerald-700">Средний ROI</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <i className="fas fa-ruble-sign text-blue-600 text-2xl mr-3"></i>
                          <div>
                            <div className="text-2xl font-bold text-blue-900">185,000</div>
                            <div className="text-sm text-blue-700">Средняя цена за м²</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <i className="fas fa-clock text-purple-600 text-2xl mr-3"></i>
                          <div>
                            <div className="text-2xl font-bold text-purple-900">45 дней</div>
                            <div className="text-sm text-purple-700">Средний срок продажи</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* AI Chat Widget */}
      <AIChat isOpen={isChatOpen} onToggle={() => setIsChatOpen(!isChatOpen)} />
    </div>
  );
}
