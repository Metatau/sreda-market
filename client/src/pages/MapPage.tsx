
import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { PropertyMap } from "@/components/Map/PropertyMap";
import { PropertyFilters } from "@/components/Property/PropertyFilters";
import { PropertyCard } from "@/components/PropertyCard";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProperties, useRegions } from "@/hooks/useProperties";
import type { Property, PropertyFilters as PropertyFiltersType } from "@/types";

export default function MapPage() {
  const [filters, setFilters] = useState<PropertyFiltersType>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapLayers, setMapLayers] = useState({
    properties: true,
    heatmap: false,
    metro: false,
    infrastructure: false
  });

  const { data: propertiesData, isLoading } = useProperties(filters, currentPage, 20);
  const properties = propertiesData?.data?.properties || [];
  const pagination = propertiesData?.data?.pagination;

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    console.log("Selected property:", property);
  };

  const handleLayerToggle = (layer: string, checked: boolean) => {
    setMapLayers(prev => ({
      ...prev,
      [layer]: checked
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main Filters */}
            <PropertyFilters
              filters={filters}
              onFiltersChange={setFilters}
            />

            {/* Map Layers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <i className="fas fa-layer-group mr-2"></i>
                  Слои карты
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="properties"
                    checked={mapLayers.properties}
                    onCheckedChange={(checked) => handleLayerToggle('properties', checked as boolean)}
                  />
                  <label htmlFor="properties" className="text-sm font-medium">
                    Объекты недвижимости
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="heatmap"
                    checked={mapLayers.heatmap}
                    onCheckedChange={(checked) => handleLayerToggle('heatmap', checked as boolean)}
                  />
                  <label htmlFor="heatmap" className="text-sm font-medium">
                    Тепловая карта цен
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="metro"
                    checked={mapLayers.metro}
                    onCheckedChange={(checked) => handleLayerToggle('metro', checked as boolean)}
                  />
                  <label htmlFor="metro" className="text-sm font-medium">
                    Станции метро
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="infrastructure"
                    checked={mapLayers.infrastructure}
                    onCheckedChange={(checked) => handleLayerToggle('infrastructure', checked as boolean)}
                  />
                  <label htmlFor="infrastructure" className="text-sm font-medium">
                    Инфраструктура
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Найдено объектов:</span>
                  <Badge variant="secondary">{pagination?.total || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Средняя цена:</span>
                  <span className="text-sm font-medium">₽15.2M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Средний м²:</span>
                  <span className="text-sm font-medium">₽312K</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map and Properties */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Map */}
            <Card>
              <CardContent className="p-0">
                <div className="h-[500px] relative bg-gray-100 rounded-lg overflow-hidden">
                  <PropertyMap
                    properties={properties}
                    selectedProperty={selectedProperty}
                    onPropertySelect={handlePropertyClick}
                  />
                  
                  {/* Map placeholder content */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <i className="fas fa-map text-4xl text-gray-400 mb-4"></i>
                      <h3 className="text-lg font-medium text-gray-700 mb-2">
                        Интерактивная карта
                      </h3>
                      <p className="text-gray-500">
                        Здесь будет отображаться карта с объектами недвижимости
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Properties List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Найденные объекты ({pagination?.total || 0})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({})}
                  >
                    <i className="fas fa-filter mr-2"></i>
                    Применить фильтры
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex space-x-4 p-4 border rounded-lg">
                          <div className="w-20 h-16 bg-gray-200 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                          <div className="w-24 text-right">
                            <div className="h-4 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : properties.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Объекты не найдены
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Попробуйте изменить параметры поиска
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <div key={property.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {property.rooms}-комнатная квартира, {property.totalArea} м²
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {property.propertyClass?.name}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              <i className="fas fa-map-marker-alt mr-1"></i>
                              {property.address}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>квартира</span>
                              <span>{property.rooms} комн.</span>
                              {property.investmentRating && (
                                <span className="text-green-600 font-medium">
                                  {property.investmentRating}%
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900 mb-1">
                              {property.price?.toLocaleString()} ₽
                            </div>
                            {property.pricePerSqm && (
                              <div className="text-sm text-gray-600">
                                {property.pricePerSqm.toLocaleString()} ₽/м²
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              <i className="fas fa-clock mr-1"></i>
                              5 мин
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center space-x-2 mt-6">
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
                      onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                      disabled={currentPage === pagination.pages}
                    >
                      Далее
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
