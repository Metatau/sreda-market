import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property, PropertyFilters, PropertiesResponse } from "@/types";

interface PropertyListProps {
  data?: PropertiesResponse;
  isLoading: boolean;
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  onPropertySelect?: (property: Property) => void;
  favorites?: number[];
  onFavoriteToggle?: (propertyId: number) => void;
}

export function PropertyList({
  data,
  isLoading,
  filters,
  onFiltersChange,
  onPropertySelect,
  favorites = [],
  onFavoriteToggle,
}: PropertyListProps) {
  const handleSortChange = (sortBy: string) => {
    // In a real app, you'd implement sorting in the API
    console.log("Sort by:", sortBy);
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ ...filters, page });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <i className="fas fa-search text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Объекты не найдены
          </h3>
          <p className="text-gray-600 mb-4">
            Попробуйте изменить параметры поиска или очистить фильтры
          </p>
          <Button
            variant="outline"
            onClick={() => onFiltersChange({})}
          >
            Очистить фильтры
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Найдено объектов: {data.total.toLocaleString()}
          </h2>
          <p className="text-sm text-gray-600">
            Страница {data.page} из {data.totalPages}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select onValueChange={handleSortChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">По цене: сначала дешевые</SelectItem>
              <SelectItem value="price-desc">По цене: сначала дорогие</SelectItem>
              <SelectItem value="date-desc">По дате: сначала новые</SelectItem>
              <SelectItem value="area-desc">По площади</SelectItem>
              <SelectItem value="roi-desc">По доходности</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onSelect={onPropertySelect}
            onFavorite={onFavoriteToggle}
            isFavorite={favorites.includes(property.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Показано {(data.page - 1) * data.limit + 1}-
            {Math.min(data.page * data.limit, data.total)} из {data.total} объектов
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.page - 1)}
              disabled={data.page <= 1}
            >
              Назад
            </Button>
            
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              const page = i + 1;
              const isCurrentPage = page === data.page;
              
              return (
                <Button
                  key={page}
                  variant={isCurrentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
            
            {data.totalPages > 5 && (
              <>
                <span className="text-gray-500">...</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.totalPages)}
                >
                  {data.totalPages}
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.page + 1)}
              disabled={data.page >= data.totalPages}
            >
              Далее
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
