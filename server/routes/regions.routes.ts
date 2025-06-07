import { Router } from 'express';
import { RegionController } from '../controllers/RegionController';

const router = Router();
const regionController = new RegionController();

// Region routes without caching for debugging
router.get("/", regionController.getRegions);
router.get("/:id", regionController.getRegion);
router.get("/:id/analytics", regionController.getRegionAnalytics);

export default router;