
import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PropertyList } from '@/components/Property/PropertyList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Trash2, Grid, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Property, PropertyFilters } from '@/types';

export function Favorites() {
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [filters, setFilters] = useState<PropertyFilters>({});

  // В реальном приложении здесь бы загружались избранные из API
  const handleRemoveFromFavorites = (propertyId: number) => {
    setFavorites(prev => prev.filter(p => p.id !== propertyId));
  };

  const handleClearAll = () => {
    setFavorites([]);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Войдите в аккаунт
              </h2>
              <p className="text-gray-600">
                Для просмотра избранного необходимо войти в систему
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Heart className="h-8 w-8 text-red-500" />
                Избранное
              </h1>
              <p className="text-gray-600 mt-2">
                {favorites.length} объектов в избранном
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {favorites.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Очистить все
                </Button>
              )}
              
              <div className="flex border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {favorites.length === 0 ? (
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Ваше избранное пусто
              </h2>
              <p className="text-gray-600 mb-6">
                Добавляйте понравившиеся объекты в избранное, нажимая на иконку сердца
              </p>
              <Button onClick={() => window.location.href = '/'}>
                Найти недвижимость
              </Button>
            </CardContent>
          </Card>
        ) : (
          <PropertyList
            data={{ properties: favorites, pagination: { page: 1, perPage: 20, total: favorites.length, pages: 1, hasNext: false, hasPrev: false } }}
            isLoading={false}
            filters={filters}
            onFiltersChange={setFilters}
            favorites={favorites.map(p => p.id)}
            onFavoriteToggle={handleRemoveFromFavorites}
          />
        )}
      </div>
    </div>
  );
}
