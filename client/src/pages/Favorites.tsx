
import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PropertyCard } from '@/components/PropertyCard';
import { InvestmentAnalyticsModal } from '@/components/InvestmentAnalyticsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Trash2, Grid, List } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '@/lib/favoritesApi';
import type { PropertyFilters, PropertyWithRelations } from '@/types';

export function Favorites() {
  const { user, isAuthenticated } = useUser();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithRelations | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's favorites
  const { data: favoritesData = [], isLoading, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.getFavorites,
    enabled: isAuthenticated,
  });

  // Clear all favorites mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      // Remove all favorites one by one
      await Promise.all(
        favoritesData.map(fav => favoritesApi.removeFromFavorites(fav.propertyId))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite'] });
    },
  });

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  const handleCalculateAnalytics = (property: PropertyWithRelations) => {
    setSelectedProperty(property);
    setShowAnalyticsModal(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          <Card className="text-center">
            <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
              <Heart className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
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
      
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <Heart className="h-8 w-8 text-red-500" />
                Избранное
              </h1>
              <p className="text-gray-600 mt-2">
                {favoritesData.length} объектов в избранном
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              {favoritesData.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={clearAllMutation.isPending}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Очистить все</span>
                  <span className="sm:hidden">Очистить</span>
                </Button>
              )}
              
              <div className="flex border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-2 sm:px-3"
                >
                  <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-2 sm:px-3"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Загружаем избранное...</p>
          </div>
        ) : favoritesData.length === 0 ? (
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 sm:pt-12 sm:pb-12 p-4 sm:p-6">
              <Heart className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4 sm:mb-6" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Ваше избранное пусто
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Добавляйте понравившиеся объекты в избранное, нажимая на иконку звездочки
              </p>
              <Button onClick={() => window.location.href = '/'} className="text-sm sm:text-base">
                Найти недвижимость
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-2 sm:gap-3 lg:gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {favoritesData.map((favorite) => (
              <PropertyCard
                key={favorite.id}
                property={favorite.property as any}
                onSelect={(property) => {
                  // Handle property selection if needed
                  console.log('Selected property:', property);
                }}
                onCalculateAnalytics={handleCalculateAnalytics}
              />
            ))}
          </div>
        )}
      </div>

      {/* Analytics Modal */}
      {selectedProperty && (
        <InvestmentAnalyticsModal
          property={selectedProperty as any}
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedProperty(null);
          }}
        />
      )}
    </div>
  );
}
