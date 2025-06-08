import { apiRequest } from './queryClient';

export interface FavoriteProperty {
  id: number;
  propertyId: number;
  createdAt: string;
  property: {
    id: number;
    title: string;
    description: string;
    price: number;
    pricePerSqm: number;
    area: string;
    rooms: number;
    floor: number;
    totalFloors: number;
    address: string;
    district: string | null;
    metroStation: string | null;
    coordinates: string;
    propertyType: string;
    marketType: string;
    source: string;
    url: string;
    imageUrl: string | null;
    images: string[];
    isActive: boolean;
    createdAt: string;
    region: {
      id: number;
      name: string;
    } | null;
    propertyClass: {
      id: number;
      name: string;
    } | null;
  };
}

export const favoritesApi = {
  // Get user's favorites
  getFavorites: async (): Promise<FavoriteProperty[]> => {
    const response = await apiRequest('/api/favorites');
    return response.data;
  },

  // Add property to favorites
  addToFavorites: async (propertyId: number): Promise<void> => {
    await apiRequest(`/api/favorites/${propertyId}`, {
      method: 'POST',
    });
  },

  // Remove property from favorites
  removeFromFavorites: async (propertyId: number): Promise<void> => {
    await apiRequest(`/api/favorites/${propertyId}`, {
      method: 'DELETE',
    });
  },

  // Check if property is favorited
  checkFavorite: async (propertyId: number): Promise<boolean> => {
    const response = await apiRequest(`/api/favorites/check/${propertyId}`);
    return response.data.isFavorited;
  },
};