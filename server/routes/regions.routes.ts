import { Router } from 'express';
import { RegionController } from '../controllers/RegionController';
import { generalRateLimit } from '../middleware/rateLimiting';
import { responseCacheMiddleware, cacheControl, etag } from '../middleware/cache';

const router = Router();
const regionController = new RegionController();

// Get all regions
router.get('/', 
  generalRateLimit,
  cacheControl(600, 'api'),
  etag,
  responseCacheMiddleware(600),
  regionController.getRegions
);

// Get region by ID
router.get('/:id',
  generalRateLimit,
  cacheControl(300, 'api'),
  etag,
  responseCacheMiddleware(300),
  regionController.getRegion
);

// Get region analytics
router.get('/:id/analytics',
  generalRateLimit,
  cacheControl(180, 'dynamic'),
  etag,
  responseCacheMiddleware(180),
  regionController.getRegionAnalytics
);

export default router;