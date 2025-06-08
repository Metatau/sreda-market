import { Router } from 'express';
import { storage } from '../storage';
import { generalRateLimit } from '../middleware/rateLimiting';
import { responseCacheMiddleware } from '../middleware/cache';

const router = Router();

// Get all property classes
router.get('/', 
  generalRateLimit,
  responseCacheMiddleware(1800), // 30 minutes cache
  async (req, res) => {
    try {
      const propertyClasses = await storage.getPropertyClasses();
      
      res.json({
        success: true,
        data: propertyClasses
      });
    } catch (error) {
      console.error('Property classes fetch error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch property classes' }
      });
    }
  }
);

// Get specific property class
router.get('/:id',
  generalRateLimit,
  responseCacheMiddleware(1800), // 30 minutes cache
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid property class ID' }
        });
      }
      
      const propertyClass = await storage.getPropertyClass(id);
      
      if (!propertyClass) {
        return res.status(404).json({
          success: false,
          error: { message: 'Property class not found' }
        });
      }
      
      res.json({
        success: true,
        data: propertyClass
      });
    } catch (error) {
      console.error('Property class fetch error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch property class' }
      });
    }
  }
);

export default router;