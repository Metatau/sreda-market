import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { propertyApi } from "@/services/api";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Grid3X3, List, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import type { SearchFilters, Property } from "@/types";

interface PropertyListProps {
  filters: SearchFilters;
  onPropertySelect?: (property: Property) => void;
  onViewModeChange?: (mode: 'grid' | 'list' | 'map') => void;
  viewMode?: 'grid' | 'list' | 'map';
}

export function PropertyList({ 
  filters, 
  onPropertySelect, 
  onViewModeChange,
  viewMode = 'grid'
}: PropertyListProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_desc');
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/properties', { ...filters, page, limit, sortBy }],
    queryFn: () => propertyApi.getProperties({ ...filters, page, limit }),
  });

  const handleFavoriteToggle = (propertyId: number, isFavorited: boolean) => {
    const newFavorites = new Set(favorites);
    if (isFavorited) {
      newFavorites.add(propertyId);
    } else {
      newFavorites.delete(propertyId);
    }
    setFavorites(newFavorites);
    // In real app, this would make an API call to save/remove favorite
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <p className="text-red-600">Ошибка загрузки объектов: {(error as Error).message}</p>
          <Button 
            className="mt-4" 
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {data ? `Найдено объектов: ${data.pagination?.total?.toLocaleString() || 0}` : 'Загрузка...'}
              </h2>
              {Object.keys(filters).length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Применены фильтры
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Sort Control */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Сначала новые</SelectItem>
                  <SelectItem value="price_asc">По цене: дешевые</SelectItem>
                  <SelectItem value="price_desc">По цене: дорогие</SelectItem>
                  <SelectItem value="area_desc">По площади</SelectItem>
                  <SelectItem value="roi_desc">По доходности</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange?.('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange?.('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange?.('map')}
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12">
          <CardContent className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Загрузка объектов...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {data && data.properties.length === 0 && !isLoading && (
        <Card className="p-12">
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              По вашему запросу ничего не найдено
            </p>
            <p className="text-sm text-gray-500">
              Попробуйте изменить фильтры поиска
            </p>
          </CardContent>
        </Card>
      )}

      {/* Properties Grid */}
      {data && data.properties.length > 0 && (
        <>
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {data.properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onSelect={onPropertySelect}
                onFavoriteToggle={handleFavoriteToggle}
                isFavorited={favorites.has(property.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.pagination && data.pagination.pages > 1 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Показано {((page - 1) * limit) + 1}-{Math.min(page * limit, data.pagination?.total || 0)} из {data.pagination?.total?.toLocaleString() || 0} объектов
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Назад
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {/* Show first page */}
                      {page > 3 && (
                        <>
                          <Button
                            variant={1 === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(1)}
                          >
                            1
                          </Button>
                          {page > 4 && <span className="px-2">...</span>}
                        </>
                      )}
                      
                      {/* Show pages around current */}
                      {Array.from({ length: Math.min(5, data.pagination?.pages || 1) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(page - 2 + i, data.pagination?.pages || 1));
                        if (pageNum < 1 || pageNum > (data.pagination?.pages || 1)) return null;
                        if (page > 3 && pageNum === 1) return null;
                        if (page < (data.pagination?.pages || 1) - 2 && pageNum === (data.pagination?.pages || 1)) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      {/* Show last page */}
                      {page < (data.pagination?.pages || 1) - 2 && (
                        <>
                          {page < (data.pagination?.pages || 1) - 3 && <span className="px-2">...</span>}
                          <Button
                            variant={(data.pagination?.pages || 1) === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(data.pagination?.pages || 1)}
                          >
                            {data.pagination?.pages || 1}
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === (data.pagination?.pages || 1)}
                    >
                      Далее
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
