import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimiting';
import { validateQuery, validateBody } from '../validation/schemas';
import { infrastructureService } from '../services/infrastructureService';
import { polygonService } from '../services/polygonService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const boundsSchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180)
});

const heatmapSchema = z.object({
  type: z.enum(['properties', 'social', 'commercial', 'transport', 'combined']),
  ...boundsSchema.shape
});

const polygonSchema = z.object({
  name: z.string().min(1).max(100),
  coordinates: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })).min(3),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().max(500).optional()
});

// Get infrastructure data for map bounds
router.get('/infrastructure', 
  apiRateLimit,
  requireAuth,
  validateQuery(boundsSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { north, south, east, west } = req.query;
      
      const infrastructure = await infrastructureService.getInfrastructureData({
        north: north as number,
        south: south as number,
        east: east as number,
        west: west as number
      });

      res.json({
        success: true,
        data: infrastructure
      });
    } catch (error) {
      console.error('Error fetching infrastructure data:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch infrastructure data',
          type: 'INFRASTRUCTURE_ERROR'
        }
      });
    }
  }
);

// Get heatmap data
router.get('/heatmap',
  apiRateLimit,
  requireAuth,
  validateQuery(heatmapSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { type, north, south, east, west } = req.query;
      
      let heatmapData;
      
      if (type === 'properties') {
        // Get property density heatmap
        heatmapData = await infrastructureService.createPropertyHeatmap({
          north: north as number,
          south: south as number,
          east: east as number,
          west: west as number
        });
      } else {
        // Get infrastructure heatmap
        heatmapData = await infrastructureService.createInfrastructureHeatmap(
          type as 'social' | 'commercial' | 'transport' | 'combined',
          {
            north: north as number,
            south: south as number,
            east: east as number,
            west: west as number
          }
        );
      }

      res.json({
        success: true,
        data: heatmapData
      });
    } catch (error) {
      console.error('Error generating heatmap:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate heatmap data',
          type: 'HEATMAP_ERROR'
        }
      });
    }
  }
);

// Get transport accessibility for property
router.get('/transport-accessibility/:propertyId',
  apiRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      
      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid property ID' }
        });
      }

      const accessibility = await infrastructureService.getTransportAccessibility(propertyId);

      res.json({
        success: true,
        data: accessibility
      });
    } catch (error) {
      console.error('Error fetching transport accessibility:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch transport accessibility',
          type: 'TRANSPORT_ERROR'
        }
      });
    }
  }
);

// Analyze districts in region
router.get('/districts/analysis/:regionId',
  apiRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const regionId = parseInt(req.params.regionId);
      
      if (isNaN(regionId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid region ID' }
        });
      }

      const analysis = await infrastructureService.analyzeDistricts(regionId);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing districts:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to analyze districts',
          type: 'ANALYSIS_ERROR'
        }
      });
    }
  }
);

// Create custom polygon
router.post('/polygons',
  apiRateLimit,
  requireAuth,
  validateBody(polygonSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { name, coordinates, color, description } = req.body;
      const userId = parseInt(req.user!.id);

      const polygon = await polygonService.createPolygon({
        userId,
        name,
        coordinates,
        color: color || '#3B82F6',
        description
      });

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
  apiRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.user!.id);
      const polygons = await polygonService.getUserPolygons(userId);

      res.json({
        success: true,
        data: polygons
      });
    } catch (error) {
      console.error('Error fetching polygons:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch polygons',
          type: 'POLYGON_ERROR'
        }
      });
    }
  }
);

// Analyze area within polygon
router.post('/polygons/:polygonId/analyze',
  apiRateLimit,
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

      const analysis = await polygonService.analyzePolygonArea(polygonId, userId);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing polygon area:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to analyze polygon area',
          type: 'ANALYSIS_ERROR'
        }
      });
    }
  }
);

// Delete polygon
router.delete('/polygons/:polygonId',
  apiRateLimit,
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

      await polygonService.deletePolygon(polygonId, userId);

      res.json({
        success: true,
        message: 'Polygon deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting polygon:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete polygon',
          type: 'POLYGON_ERROR'
        }
      });
    }
  }
);

export { router as mapRoutes };