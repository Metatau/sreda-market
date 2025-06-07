import { Router } from 'express';
import { RegionController } from '../controllers/RegionController';
import { cacheControl } from '../middleware/cache';
import { etag, responseCacheMiddleware } from '../middleware/cache';

const router = Router();
const regionController = new RegionController();

// Region routes with caching
router.get("/", cacheControl(600, 'api'), etag, responseCacheMiddleware(600), regionController.getRegions);
router.get("/:id", cacheControl(300, 'api'), etag, responseCacheMiddleware(300), regionController.getRegion);
router.get("/:id/analytics", cacheControl(180, 'dynamic'), etag, responseCacheMiddleware(180), regionController.getRegionAnalytics);

export default router;