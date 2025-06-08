import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { favorites, properties, regions, propertyClasses } from '../../shared/schema';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get user's favorites
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const userFavorites = await db
      .select({
        id: favorites.id,
        propertyId: favorites.propertyId,
        createdAt: favorites.createdAt,
        property: {
          id: properties.id,
          title: properties.title,
          description: properties.description,
          price: properties.price,
          pricePerSqm: properties.pricePerSqm,
          area: properties.area,
          rooms: properties.rooms,
          floor: properties.floor,
          totalFloors: properties.totalFloors,
          address: properties.address,
          district: properties.district,
          metroStation: properties.metroStation,
          coordinates: properties.coordinates,
          propertyType: properties.propertyType,
          marketType: properties.marketType,
          source: properties.source,
          url: properties.url,
          imageUrl: properties.imageUrl,
          images: properties.images,
          isActive: properties.isActive,
          createdAt: properties.createdAt,
        },
        region: {
          id: regions.id,
          name: regions.name,
        },
        propertyClass: {
          id: propertyClasses.id,
          name: propertyClasses.name,
        },
      })
      .from(favorites)
      .leftJoin(properties, eq(favorites.propertyId, properties.id))
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .where(eq(favorites.userId, userId))
      .orderBy(favorites.createdAt);

    res.json({
      success: true,
      data: userFavorites.map(fav => ({
        id: fav.id,
        propertyId: fav.propertyId,
        createdAt: fav.createdAt,
        property: {
          ...fav.property,
          region: fav.region,
          propertyClass: fav.propertyClass,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch favorites' },
    });
  }
});

// Add property to favorites
router.post('/:propertyId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const propertyId = parseInt(req.params.propertyId);

    if (isNaN(propertyId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid property ID' },
      });
    }

    // Check if property exists
    const property = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (property.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Property not found' },
      });
    }

    // Check if already favorited
    const existingFavorite = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
      .limit(1);

    if (existingFavorite.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Property already in favorites' },
      });
    }

    // Add to favorites
    const newFavorite = await db
      .insert(favorites)
      .values({
        userId,
        propertyId,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: newFavorite[0],
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add to favorites' },
    });
  }
});

// Remove property from favorites
router.delete('/:propertyId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const propertyId = parseInt(req.params.propertyId);

    if (isNaN(propertyId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid property ID' },
      });
    }

    const deleted = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Favorite not found' },
      });
    }

    res.json({
      success: true,
      data: { message: 'Removed from favorites' },
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove from favorites' },
    });
  }
});

// Check if property is favorited
router.get('/check/:propertyId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const propertyId = parseInt(req.params.propertyId);

    if (isNaN(propertyId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid property ID' },
      });
    }

    const favorite = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
      .limit(1);

    res.json({
      success: true,
      data: { isFavorited: favorite.length > 0 },
    });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to check favorite status' },
    });
  }
});

export default router;