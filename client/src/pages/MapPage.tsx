
import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyMap } from "@/components/PropertyMap";
import { PropertyCard } from "@/components/PropertyCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProperties } from "@/hooks/useProperties";
import type { SearchFilters, Property } from "@/types";

export default function MapPage() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  const { data: propertiesData, isLoading } = useProperties(filters, 1, 100);
  const properties = propertiesData?.properties || [];

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    console.log("Selected property:", property);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Карта объектов недвижимости</h1>
          <p className="text-gray-600">Интерактивная карта для поиска и анализа недвижимости</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <PropertyFilters 
                filters={filters} 
                onFiltersChange={handleFiltersChange} 
              />
            </div>
          </div>

          {/* Map Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Map */}
            <PropertyMap 
              selectedRegionId={filters.regionId}
              selectedPropertyClassId={filters.propertyClassId}
              onPropertySelect={handlePropertySelect}
            />

            {/* Selected Property Details */}
            {selectedProperty && (
              <Card>
                <CardHeader>
                  <CardTitle>Выбранный объект</CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyCard 
                    property={selectedProperty} 
                    onSelect={handlePropertySelect}
                  />
                </CardContent>
              </Card>
            )}

            {/* Properties List */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Объекты на карте ({properties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                    <span className="ml-2 text-gray-500">Загрузка...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {properties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onSelect={handlePropertySelect}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
