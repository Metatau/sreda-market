import { Router } from 'express';
import { PropertyClassController } from '../controllers/PropertyClassController';
import { generalRateLimit } from '../middleware/rateLimiting';
import { responseCacheMiddleware, cacheControl, etag } from '../middleware/cache';

const router = Router();
const propertyClassController = new PropertyClassController();

// Get all property classes
router.get('/', 
  generalRateLimit,
  cacheControl(1800, 'static'),
  etag,
  responseCacheMiddleware(1800),
  propertyClassController.getPropertyClasses
);

// Get property class by ID
router.get('/:id',
  generalRateLimit,
  cacheControl(1800, 'static'),
  etag,
  responseCacheMiddleware(1800),
  propertyClassController.getPropertyClass
);

export default router;