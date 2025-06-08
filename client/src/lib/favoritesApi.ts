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
    const response = await fetch('/api/favorites', {
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    return result.data;
  },

  // Add property to favorites
  addToFavorites: async (propertyId: number): Promise<void> => {
    await fetch(`/api/favorites/${propertyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Remove property from favorites
  removeFromFavorites: async (propertyId: number): Promise<void> => {
    await fetch(`/api/favorites/${propertyId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Check if property is favorited
  checkFavorite: async (propertyId: number): Promise<boolean> => {
    const response = await fetch(`/api/favorites/check/${propertyId}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    return result.data.isFavorited;
  },
};