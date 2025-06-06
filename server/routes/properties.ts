import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';

const router = Router();

// Validation schemas
const propertyFiltersSchema = z.object({
  regionId: z.number().optional(),
  propertyClassId: z.number().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  rooms: z.number().positive().optional(),
  minArea: z.number().positive().optional(),
  maxArea: z.number().positive().optional(),
  propertyType: z.string().optional(),
  marketType: z.enum(['secondary', 'new_construction']).optional()
});

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(20)
});

const searchSchema = z.object({
  query: z.string().min(1),
  filters: propertyFiltersSchema.optional()
});

// Get all properties with filters and pagination
router.get('/', async (req, res) => {
  try {
    // Parse and validate query parameters
    const filters = propertyFiltersSchema.parse({
      regionId: req.query.regionId ? Number(req.query.regionId) : undefined,
      propertyClassId: req.query.propertyClassId ? Number(req.query.propertyClassId) : undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      rooms: req.query.rooms ? Number(req.query.rooms) : undefined,
      minArea: req.query.minArea ? Number(req.query.minArea) : undefined,
      maxArea: req.query.maxArea ? Number(req.query.maxArea) : undefined,
      propertyType: req.query.propertyType as string,
      marketType: req.query.marketType as 'secondary' | 'new_construction'
    });

    const pagination = paginationSchema.parse({
      page: req.query.page ? Number(req.query.page) : 1,
      perPage: req.query.perPage ? Number(req.query.perPage) : 20
    });

    const result = await storage.getProperties(filters, pagination);
    
    res.json({
      success: true,
      data: result.properties,
      pagination: {
        page: pagination.page,
        perPage: pagination.perPage,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.perPage)
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Неверные параметры запроса',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении объектов недвижимости'
    });
  }
});

// Get single property by ID
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Неверный ID объекта'
      });
    }

    const property = await storage.getProperty(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Объект недвижимости не найден'
      });
    }

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении объекта недвижимости'
    });
  }
});

// Search properties
router.post('/search', async (req, res) => {
  try {
    const { query, filters } = searchSchema.parse(req.body);
    
    const properties = await storage.searchProperties(query, filters);
    
    res.json({
      success: true,
      data: properties,
      count: properties.length
    });
  } catch (error) {
    console.error('Search properties error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Неверные параметры поиска',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при поиске объектов недвижимости'
    });
  }
});

// Get property analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Неверный ID объекта'
      });
    }

    const analytics = await storage.getPropertyAnalytics(id);
    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: 'Аналитика для объекта не найдена'
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get property analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении аналитики объекта'
    });
  }
});

// Get map data with filters
router.get('/map/data', async (req, res) => {
  try {
    const filters = propertyFiltersSchema.parse({
      regionId: req.query.regionId ? Number(req.query.regionId) : undefined,
      propertyClassId: req.query.propertyClassId ? Number(req.query.propertyClassId) : undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      rooms: req.query.rooms ? Number(req.query.rooms) : undefined,
      propertyType: req.query.propertyType as string,
      marketType: req.query.marketType as 'secondary' | 'new_construction'
    });

    const mapData = await storage.getMapData(filters);
    
    res.json({
      success: true,
      data: mapData,
      count: mapData.length
    });
  } catch (error) {
    console.error('Get map data error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Неверные параметры фильтрации',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении данных для карты'
    });
  }
});

export default router;