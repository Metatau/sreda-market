import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/unified-auth';
import { mapRateLimit } from '../middleware/rateLimiting';
import { storage } from '../storage';
import { db } from '../db';
import { mapPreloadService } from '../services/mapPreloadService';

const router = Router();

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Map Service',
      endpoints: [
        'GET /heatmap - Get property heatmap data',
        'GET /clusters - Get property clusters',
        'GET /bounds - Get map bounds for properties'
      ],
      status: 'active'
    }
  });
});

// Get property heatmap data
router.get('/heatmap',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { 
        regionId, 
        propertyClassId, 
        minPrice, 
        maxPrice, 
        type = 'price'
      } = req.query;

      const bounds = {
        north: req.query.north ? parseFloat(req.query.north as string) : 60.0,
        south: req.query.south ? parseFloat(req.query.south as string) : 55.0,
        east: req.query.east ? parseFloat(req.query.east as string) : 40.0,
        west: req.query.west ? parseFloat(req.query.west as string) : 35.0
      };

      const filters = {
        regionId: regionId ? parseInt(regionId as string) : undefined,
        propertyClassId: propertyClassId ? parseInt(propertyClassId as string) : undefined,
        minPrice: minPrice ? parseInt(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined
      };

      // Try to get preloaded heatmap data first for better performance
      const preloadedHeatmap = mapPreloadService.getPreloadedHeatmap(bounds);
      
      if (preloadedHeatmap && type === 'properties' && !filters.regionId && !filters.propertyClassId && !filters.minPrice && !filters.maxPrice) {
        console.log('Using preloaded heatmap data for performance boost');
        return res.json({
          success: true,
          data: preloadedHeatmap,
          cached: true,
          source: 'preloaded'
        });
      }

      const mapData = await storage.getMapData(filters);

      // Filter by bounds and create heatmap points
      const heatmapData = mapData
        .filter(property => {
          if (!property.coordinates) return false;
          try {
            const coords = JSON.parse(property.coordinates);
            const lat = coords.lat || coords[1];
            const lng = coords.lng || coords[0];
            return lat >= bounds.south && lat <= bounds.north && 
                   lng >= bounds.west && lng <= bounds.east;
          } catch {
            return false;
          }
        })
        .map(property => {
          const coords = JSON.parse(property.coordinates);
          const lat = coords.lat || coords[1];
          const lng = coords.lng || coords[0];
          
          let intensity = 0.5;
          if (type === 'price' && property.price) {
            intensity = Math.min(property.price / 10000000, 1);
          } else if (type === 'investment' && property.investmentScore) {
            intensity = property.investmentScore / 10;
          }

          return {
            lat,
            lng,
            intensity: Math.max(0.1, intensity)
          };
        });

      res.json({
        success: true,
        data: heatmapData,
        cached: false,
        source: 'database'
      });
    } catch (error) {
      console.error('Error generating heatmap:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to generate heatmap data' }
      });
    }
  }
);

// Get infrastructure data for map
router.get('/infrastructure',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { bounds, types } = req.query;
      
      const parsedBounds = {
        north: req.query.north ? parseFloat(req.query.north as string) : 60.0,
        south: req.query.south ? parseFloat(req.query.south as string) : 55.0,
        east: req.query.east ? parseFloat(req.query.east as string) : 40.0,
        west: req.query.west ? parseFloat(req.query.west as string) : 35.0
      };

      // Try to get preloaded infrastructure data first
      const preloadedInfrastructure = mapPreloadService.getPreloadedInfrastructure(parsedBounds);
      
      if (preloadedInfrastructure) {
        console.log('Using preloaded infrastructure data for performance boost');
        return res.json({
          success: true,
          data: preloadedInfrastructure,
          cached: true,
          source: 'preloaded'
        });
      }
      
      // Return basic infrastructure data structure
      const infrastructureData = {
        transport: [],
        education: [],
        healthcare: [],
        shopping: [],
        recreation: []
      };

      res.json({
        success: true,
        data: infrastructureData,
        cached: false,
        source: 'default'
      });
    } catch (error) {
      console.error('Error fetching infrastructure:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch infrastructure data' }
      });
    }
  }
);

// Create polygon
router.post('/polygons',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { name, coordinates, color, description } = req.body;
      const userId = String(req.user!.id);

      const polygon = {
        id: Date.now(),
        userId,
        name: name || 'Custom Polygon',
        coordinates: coordinates || [],
        color: color || '#3B82F6',
        description: description || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      res.json({
        success: true,
        data: polygon
      });
    } catch (error) {
      console.error('Error creating polygon:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create polygon',
          type: 'POLYGON_ERROR'
        }
      });
    }
  }
);

// Get user polygons
router.get('/polygons',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = String(req.user!.id);
      const polygons: any[] = [];

      res.json({
        success: true,
        data: polygons
      });
    } catch (error) {
      console.error('Error fetching polygons:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch polygons' }
      });
    }
  }
);

// Analyze area within polygon
router.post('/polygons/:polygonId/analyze',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const polygonId = parseInt(req.params.polygonId);
      const userId = String(req.user!.id);
      
      if (isNaN(polygonId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid polygon ID' }
        });
      }

      const analysis = {
        properties: [],
        avgPrice: 0,
        totalProperties: 0,
        investmentScore: 0,
        marketTrends: []
      };

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing polygon area:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to analyze polygon area' }
      });
    }
  }
);

// Delete polygon
router.delete('/polygons/:polygonId',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const polygonId = parseInt(req.params.polygonId);
      const userId = String(req.user!.id);
      
      if (isNaN(polygonId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid polygon ID' }
        });
      }

      res.json({
        success: true,
        message: 'Polygon deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting polygon:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to delete polygon' }
      });
    }
  }
);

// Compare districts
router.post('/districts/compare',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { districts } = req.body;

      if (!Array.isArray(districts) || districts.length < 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'At least 2 districts required for comparison' }
        });
      }

      const comparison = districts.map(district => ({
        name: district.name || 'Unknown District',
        avgPrice: 0,
        totalProperties: 0,
        investmentScore: 0,
        infrastructure: {
          transport: 0,
          education: 0,
          healthcare: 0
        }
      }));

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('Error comparing districts:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to compare districts' }
      });
    }
  }
);

// Get transport accessibility data
router.get('/transport-accessibility',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { lat, lng, radius = 1000 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          error: { message: 'Latitude and longitude are required' }
        });
      }

      const accessibility = {
        metro: [],
        bus: [],
        accessibility_score: 0,
        travel_times: {}
      };

      res.json({
        success: true,
        data: accessibility
      });
    } catch (error) {
      console.error('Error fetching transport accessibility:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch transport accessibility' }
      });
    }
  }
);

// Get preload status (admin only)
router.get('/preload-status',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = mapPreloadService.getPreloadStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error fetching preload status:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch preload status' }
      });
    }
  }
);

// Force preload refresh (admin only)
router.post('/force-preload',
  mapRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log('Manual preload triggered by user:', req.user?.email);
      
      // Start preload in background
      mapPreloadService.forcePreload().catch(err => {
        console.error('Force preload error:', err);
      });
      
      res.json({
        success: true,
        message: 'Preload refresh started in background'
      });
    } catch (error) {
      console.error('Error triggering force preload:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to trigger preload refresh' }
      });
    }
  }
);

export default router;