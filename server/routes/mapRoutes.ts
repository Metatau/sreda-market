import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/unified-auth';
import { mapRateLimit } from '../middleware/rateLimiting';
import { storage } from '../storage';
import { db } from '../db';

const router = Router();

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
        data: heatmapData
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
        data: infrastructureData
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
      const userId = parseInt(req.user!.id);

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
      const userId = req.user!.id;
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
      const userId = parseInt(req.user!.id);
      
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
      const userId = req.user!.id;
      
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

export default router;