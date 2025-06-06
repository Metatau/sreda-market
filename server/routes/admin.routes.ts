/**
 * Admin routes - extracted from monolithic routes.ts
 */
import { Router } from 'express';
import { addUserContext, requireAdmin } from '../middleware/unified-auth';
import { ResponseHelper } from '../utils/response-helpers';
import { handleAsyncError } from '../utils/errors';
import { schedulerService } from '../services/schedulerService';
import { adsApiService } from '../services/adsApiService';

const router = Router();

// Apply user context and require admin for all routes
router.use(addUserContext);
router.use(requireAdmin);

/**
 * GET /api/admin/ads-api/status - Get ADS API status
 */
router.get('/ads-api/status', handleAsyncError(async (req, res) => {
  const status = await adsApiService.getStatus();
  ResponseHelper.success(res, status);
}));

/**
 * POST /api/admin/ads-api/sync - Sync properties from ADS API
 */
router.post('/ads-api/sync', handleAsyncError(async (req, res) => {
  const { regions, credentials } = req.body;
  
  if (!regions || !Array.isArray(regions)) {
    return ResponseHelper.validationError(res, 'Regions array is required');
  }

  const result = await adsApiService.syncProperties(regions, credentials);
  ResponseHelper.success(res, result);
}));

/**
 * GET /api/admin/scheduler/status - Get scheduler status
 */
router.get('/scheduler/status', handleAsyncError(async (req, res) => {
  const status = schedulerService.getStatus();
  ResponseHelper.success(res, status);
}));

/**
 * POST /api/admin/scheduler/start - Start scheduler
 */
router.post('/scheduler/start', handleAsyncError(async (req, res) => {
  try {
    schedulerService.start();
    ResponseHelper.success(res, { message: 'Scheduler started successfully' });
  } catch (error) {
    ResponseHelper.error(res, 'Failed to start scheduler', 'SCHEDULER_ERROR', 500);
  }
}));

/**
 * POST /api/admin/scheduler/stop - Stop scheduler
 */
router.post('/scheduler/stop', handleAsyncError(async (req, res) => {
  try {
    schedulerService.stop();
    ResponseHelper.success(res, { message: 'Scheduler stopped successfully' });
  } catch (error) {
    ResponseHelper.error(res, 'Failed to stop scheduler', 'SCHEDULER_ERROR', 500);
  }
}));

export default router;