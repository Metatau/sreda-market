import { Router } from 'express';
import { requireSessionAdmin, type SessionAuthenticatedRequest } from '../middleware/sessionAuth';
import { adminRateLimitMiddleware } from '../middleware/adminRateLimit';
import { adsApiService } from '../services/adsApiService';
import { schedulerService } from '../services/schedulerService';

const router = Router();

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Admin Service',
      endpoints: [
        'GET /ads-api/status - Get ADS API status',
        'POST /ads-api/sync - Trigger ADS API sync',
        'GET /scheduler/status - Get scheduler status',
        'POST /scheduler/start - Start scheduler',
        'POST /scheduler/stop - Stop scheduler'
      ],
      status: 'active',
      access: 'admin-only'
    }
  });
});

// ADS API status endpoint
router.get('/ads-api/status', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res) => {
  try {
    const status = await adsApiService.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    console.error("Error getting ADS API status:", error);
    res.status(500).json({ 
      success: false, 
      error: { 
        message: "Failed to get ADS API status", 
        type: "INTERNAL_ERROR" 
      } 
    });
  }
});

// ADS API synchronization endpoint
router.post('/ads-api/sync', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res) => {
  try {
    const { regions, credentials } = req.body;
    console.log('Starting ADS API sync for regions:', regions);
    
    const result = await adsApiService.syncProperties(regions, credentials);
    
    console.log('ADS API sync completed:', result);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error syncing properties:", error);
    res.status(500).json({ 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : "Failed to sync properties", 
        type: "SYNC_ERROR" 
      } 
    });
  }
});

// Scheduler status endpoint
router.get('/scheduler/status', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res) => {
  try {
    const status = {
      isActive: true,
      uptime: process.uptime(),
      message: 'Scheduler is running with cron jobs'
    };
    res.json({ success: true, data: status });
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    res.status(500).json({ 
      success: false, 
      error: { 
        message: "Failed to get scheduler status", 
        type: "INTERNAL_ERROR" 
      } 
    });
  }
});

// Manual scheduler trigger
router.post('/scheduler/sync', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res) => {
  try {
    console.log('Manual sync triggered by admin:', req.user?.email);
    
    // Запускаем ручную синхронизацию через ADS API
    const regions = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Казань', 'Уфа'];
    const result = await adsApiService.syncProperties(regions);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error triggering manual sync:", error);
    res.status(500).json({ 
      success: false, 
      error: { 
        message: error instanceof Error ? error.message : "Failed to trigger sync", 
        type: "SYNC_ERROR" 
      } 
    });
  }
});

// Start scheduler
router.post('/scheduler/start', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res) => {
  try {
    schedulerService.start();
    res.json({ success: true, message: 'Scheduler started successfully' });
  } catch (error) {
    console.error("Error starting scheduler:", error);
    res.status(500).json({ 
      success: false, 
      error: { 
        message: "Failed to start scheduler", 
        type: "INTERNAL_ERROR" 
      } 
    });
  }
});

// Stop scheduler
router.post('/scheduler/stop', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res) => {
  try {
    schedulerService.stop();
    res.json({ success: true, message: 'Scheduler stopped successfully' });
  } catch (error) {
    console.error("Error stopping scheduler:", error);
    res.status(500).json({ 
      success: false, 
      error: { 
        message: "Failed to stop scheduler", 
        type: "INTERNAL_ERROR" 
      } 
    });
  }
});

export default router;