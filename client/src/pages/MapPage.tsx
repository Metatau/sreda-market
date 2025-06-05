import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { PropertyMap } from "@/components/PropertyMap";
import { PropertyCard } from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useProperties, useRegions } from "@/hooks/useProperties";
import type { Property } from "@/types";

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("moscow");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const { data: regions = [] } = useRegions();
  const { data: propertiesData, isLoading } = useProperties({}, currentPage, 20);

  const properties = propertiesData?.properties || [];
  const pagination = propertiesData?.pagination;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search functionality can be implemented here if needed
    setCurrentPage(1);
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
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
                <i className="fas fa-map text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Карта объектов</h1>
                <p className="text-xs text-gray-500">Интерактивная карта недвижимости</p>
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

            {/* Region Selector */}
            <div className="flex items-center space-x-4">
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Выберите регион" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.name.toLowerCase()}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Map View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="h-[700px]">
              <CardContent className="p-0 h-full">
                <PropertyMap
                  onPropertySelect={handlePropertyClick}
                />
              </CardContent>
            </Card>
          </div>

          {/* Property List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Найдено объектов: {pagination?.total || 0}
              </h3>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="max-h-[650px] overflow-y-auto space-y-4">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onSelect={() => handlePropertyClick(property)}
                  />
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
          </div>
        </div>
      </div>
    </div>
  );
}