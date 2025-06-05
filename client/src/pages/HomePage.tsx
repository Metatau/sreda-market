import { useState } from "react";
import { Header } from "@/components/Header";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyList } from "@/components/PropertyList";
import { PropertyMap } from "@/components/PropertyMap";
import { AIChat } from "@/components/AIChat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, List, BarChart3, TrendingUp, Home, DollarSign } from "lucide-react";
import { useNewProperties } from "@/hooks/useNewProperties";
import type { SearchFilters, Property } from "@/types";

export function HomePage() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("map");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const { data: newPropertiesData } = useNewProperties();

  const handleRegionChange = (regionId: number | undefined) => {
    setFilters(prev => ({ ...prev, regionId }));
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFilters(prev => ({ ...prev, address: query }));
  };

  const handleSearch = () => {
    // Search is automatically triggered by filter changes
    console.log('Search triggered with filters:', filters);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    // In a real app, this would open a property detail modal or navigate to detail page
    console.log('Selected property:', property);
  };

  const handleViewModeChange = (mode: 'grid' | 'list' | 'map') => {
    setActiveTab(mode === 'grid' || mode === 'list' ? 'list' : 'map');
  };

  const handleAISearch = (query: string) => {
    // Process AI search query
    console.log('AI Search query:', query);
    // This would typically parse the AI query and update filters accordingly
    // For now, we'll just add it to the address filter
    setFilters(prev => ({ ...prev, address: query }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        selectedRegionId={filters.regionId}
        onRegionChange={handleRegionChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearch={handleSearch}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <PropertyFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
            
            {/* Analytics Metrics */}
            <div className="space-y-4">
              {/* Average Yield Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                    Средняя доходность
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-green-600">8.2%</div>
                  <p className="text-xs text-gray-500 mt-1">+0.3% за месяц</p>
                </CardContent>
              </Card>

              {/* Market Trend Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                    Рыночный тренд
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-blue-600">↗ Рост</div>
                  <p className="text-xs text-gray-500 mt-1">+2.1% за квартал</p>
                </CardContent>
              </Card>

              {/* New Properties Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <Home className="h-4 w-4 mr-2 text-orange-500" />
                    Новые объекты
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-orange-600">
                    {newPropertiesData?.count || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">за {newPropertiesData?.period || '24ч'}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Navigation Tabs */}
              <Card className="mb-6">
                <CardContent className="p-0">
                  <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent">
                    <TabsTrigger 
                      value="map" 
                      className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-white"
                    >
                      <Map className="h-4 w-4" />
                      <span>Карта</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="list" 
                      className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-white"
                    >
                      <List className="h-4 w-4" />
                      <span>Список</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="analytics" 
                      className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-white"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Аналитика</span>
                    </TabsTrigger>
                  </TabsList>
                </CardContent>
              </Card>

              {/* Map View */}
              <TabsContent value="map" className="space-y-6">
                <PropertyMap
                  filters={filters}
                  onPropertySelect={handlePropertySelect}
                />
                
                {/* Properties grid below map */}
                <PropertyList
                  filters={filters}
                  onPropertySelect={handlePropertySelect}
                  onViewModeChange={handleViewModeChange}
                  viewMode="grid"
                />
              </TabsContent>

              {/* List View */}
              <TabsContent value="list">
                <PropertyList
                  filters={filters}
                  onPropertySelect={handlePropertySelect}
                  onViewModeChange={handleViewModeChange}
                  viewMode="list"
                />
              </TabsContent>

              {/* Analytics View */}
              <TabsContent value="analytics">
                <Card>
                  <CardContent className="p-12 text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Аналитика рынка
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Интерактивные графики и аналитика по инвестиционной привлекательности
                    </p>
                    <Button>Скоро будет доступно</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* AI Chat Widget */}
      <AIChat 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)}
        onMessage={handleAISearch} 
      />

      {/* Property Detail Modal would go here */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedProperty.title}
                  </h2>
                  <p className="text-gray-600">{selectedProperty.address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedProperty(null)}
                >
                  ×
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img 
                    src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                    alt={selectedProperty.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {selectedProperty.price.toLocaleString()} ₽
                  </div>
                  {selectedProperty.pricePerSqm && (
                    <div className="text-gray-600">
                      {selectedProperty.pricePerSqm.toLocaleString()} ₽/м²
                    </div>
                  )}
                  {selectedProperty.description && (
                    <p className="text-gray-700">{selectedProperty.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
