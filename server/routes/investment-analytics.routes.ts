import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { simpleInvestmentAnalyticsService } from '../services/simpleInvestmentAnalytics';
import { generalRateLimit } from '../middleware/rateLimiting';
import { responseCacheMiddleware } from '../middleware/cache';

const router = Router();

// Get investment analytics by property ID
router.get('/', 
  generalRateLimit,
  responseCacheMiddleware(300),
  async (req, res) => {
    try {
      const propertyId = parseInt(req.query.propertyId as string);
      if (isNaN(propertyId) || !propertyId) {
        return res.status(400).json({ 
          success: false,
          error: { message: "Property ID is required" }
        });
      }

      const analytics = await simpleInvestmentAnalyticsService.getAnalytics(propertyId);
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error("Error fetching investment analytics:", error);
      res.status(500).json({ 
        success: false,
        error: { message: "Failed to fetch investment analytics" }
      });
    }
  }
);

// Get investment analytics by ID
router.get('/:id',
  generalRateLimit,
  responseCacheMiddleware(300),
  async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      if (isNaN(propertyId)) {
        return res.status(400).json({ 
          success: false,
          error: { message: "Invalid property ID" }
        });
      }

      const analytics = await simpleInvestmentAnalyticsService.getAnalytics(propertyId);
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error("Error fetching investment analytics:", error);
      res.status(500).json({ 
        success: false,
        error: { message: "Failed to fetch investment analytics" }
      });
    }
  }
);

// Calculate investment analytics for a property
router.post('/:id/calculate',
  generalRateLimit,
  async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      if (isNaN(propertyId)) {
        return res.status(400).json({ 
          success: false,
          error: { message: "Invalid property ID" }
        });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ 
          success: false,
          error: { message: "Property not found" }
        });
      }

      // Calculate analytics using the simple investment analytics service
      const analytics = await simpleInvestmentAnalyticsService.calculateAnalytics(propertyId);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error("Error calculating investment analytics:", error);
      res.status(500).json({ 
        success: false,
        error: { message: "Failed to calculate investment analytics" }
      });
    }
  }
);

// Batch calculate investment analytics
router.post('/batch-calculate',
  generalRateLimit,
  async (req, res) => {
    try {
      const batchSchema = z.object({
        propertyIds: z.array(z.number()),
      });

      const { propertyIds } = batchSchema.parse(req.body);
      
      const results = [];
      for (const propertyId of propertyIds) {
        try {
          const analytics = await simpleInvestmentAnalyticsService.calculateAnalytics(propertyId);
          results.push({ propertyId, status: 'success', analytics });
        } catch (error) {
          results.push({ 
            propertyId, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      
      res.json({
        success: true,
        data: { results }
      });
    } catch (error) {
      console.error("Error in batch calculation:", error);
      res.status(500).json({ 
        success: false,
        error: { message: "Failed to batch calculate analytics" }
      });
    }
  }
);

export default router;