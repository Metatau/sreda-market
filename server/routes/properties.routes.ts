import { Router } from 'express';
import { OptimizedPropertyService } from '../services/OptimizedPropertyService';
import { requireAuth, requireAdmin } from '../middleware/unified-auth';
import { validateQuery, validateBody, propertyFiltersSchema } from '../validation/schemas';
import { generalRateLimit } from '../middleware/rateLimiting';
import { responseCacheMiddleware } from '../middleware/cache';

const router = Router();

// Получение списка объектов с фильтрацией и пагинацией
router.get('/', 
  generalRateLimit,
  responseCacheMiddleware(300), // 5 minutes cache
  validateQuery(propertyFiltersSchema),
  async (req, res) => {
    try {
      // Normalize parameters from both snake_case and camelCase
      const query = req.query;
      console.log('🔍 Properties route received query params:', query);
      
      const filters: any = {};
      
      // Handle regionId
      if (query.regionId || query.region_id) {
        filters.regionId = Number(query.regionId || query.region_id);
      }
      
      // Handle propertyClassId
      if (query.propertyClassId || query.property_class_id) {
        filters.propertyClassId = Number(query.propertyClassId || query.property_class_id);
      }
      
      // Handle price filters
      if (query.minPrice || query.min_price) {
        filters.minPrice = Number(query.minPrice || query.min_price);
      }
      if (query.maxPrice || query.max_price) {
        filters.maxPrice = Number(query.maxPrice || query.max_price);
      }
      
      // Handle rooms
      if (query.rooms) {
        filters.rooms = Number(query.rooms);
      }
      
      // Handle area filters
      if (query.minArea || query.min_area) {
        filters.minArea = Number(query.minArea || query.min_area);
      }
      if (query.maxArea || query.max_area) {
        filters.maxArea = Number(query.maxArea || query.max_area);
      }
      
      // Handle property type
      if (query.propertyType || query.property_type) {
        filters.propertyType = String(query.propertyType || query.property_type);
      }
      
      // Handle market type
      if (query.marketType || query.market_type) {
        filters.marketType = String(query.marketType || query.market_type);
      }
      
      // Handle search query
      if (query.query) {
        filters.query = String(query.query);
      }
      
      console.log('🎯 Normalized filters for OptimizedPropertyService:', filters);
      
      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        perPage: parseInt(req.query.per_page as string) || parseInt(req.query.perPage as string) || 10
      };

      const result = await OptimizedPropertyService.getPropertiesWithRelations(filters, pagination);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Properties fetch error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch properties' }
      });
    }
  }
);

// Получение конкретного объекта
router.get('/:id',
  generalRateLimit,
  responseCacheMiddleware(600), // 10 минут кеша
  requireAuth,
  async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid property ID' }
        });
      }

      const result = await OptimizedPropertyService.getPropertiesWithRelations(
        {},
        { page: 1, perPage: 1 }
      );

      const property = result.properties.find(p => p.id === propertyId);
      
      if (!property) {
        return res.status(404).json({
          success: false,
          error: { message: 'Property not found' }
        });
      }

      res.json({
        success: true,
        data: property
      });
    } catch (error) {
      console.error('Property fetch error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch property' }
      });
    }
  }
);

// Поиск объектов
router.get('/search/:query',
  generalRateLimit,
  responseCacheMiddleware(180), // 3 минуты кеша
  validateQuery(propertyFiltersSchema),
  async (req, res) => {
    try {
      const searchQuery = req.params.query;
      const filters = req.query;

      if (!searchQuery || searchQuery.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'Search query must be at least 2 characters' }
        });
      }

      const results = await OptimizedPropertyService.searchProperties(searchQuery, filters);
      
      res.json({
        success: true,
        data: {
          query: searchQuery,
          results,
          total: results.length
        }
      });
    } catch (error) {
      console.error('Property search error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Search failed' }
      });
    }
  }
);

// Получение данных для карты
router.get('/map/data',
  generalRateLimit,
  responseCacheMiddleware(600), // 10 минут кеша
  validateQuery(propertyFiltersSchema),
  async (req, res) => {
    try {
      const filters = req.query;
      const mapData = await OptimizedPropertyService.getMapData(filters);
      
      res.json({
        success: true,
        data: {
          type: "FeatureCollection",
          features: mapData
        }
      });
    } catch (error) {
      console.error('Map data fetch error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch map data' }
      });
    }
  }
);

// Получение аналитики по региону
router.get('/analytics/region/:regionId',
  generalRateLimit,
  responseCacheMiddleware(1800), // 30 минут кеша
  requireAuth,
  async (req, res) => {
    try {
      const regionId = parseInt(req.params.regionId);
      
      if (isNaN(regionId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid region ID' }
        });
      }

      const analytics = await OptimizedPropertyService.getRegionAnalytics(regionId);
      
      if (!analytics) {
        return res.status(404).json({
          success: false,
          error: { message: 'Region not found' }
        });
      }

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Region analytics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch region analytics' }
      });
    }
  }
);

// Получение статистики для дашборда
router.get('/dashboard/stats',
  generalRateLimit,
  responseCacheMiddleware(900), // 15 минут кеша
  requireAuth,
  async (req, res) => {
    try {
      const stats = await OptimizedPropertyService.getDashboardStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch dashboard stats' }
      });
    }
  }
);

export default router;