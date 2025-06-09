import type { Express } from "express";
import { createServer, type Server } from "http";
import { corsMiddleware } from "../middleware/cors";
import { sessionConfig } from "../middleware/sessionAuth";
import { generalRateLimit } from "../middleware/rateLimiting";
import { performanceMonitor } from "../services/performanceService";
import { compression } from "../middleware/cache";
import { globalErrorHandler } from "../utils/errors";
import { UserService } from "../services/userService";

// Import modular routes
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import propertiesRoutes from "./properties.routes";
import propertyClassesRoutes from "./property-classes.routes";
import analyticsRoutes from "./analytics.routes";
import investmentAnalyticsRoutes from "./investment-analytics.routes";
import promocodesRoutes from "./promocodes.routes";
import regionsRoutes from "./regions.routes";
import { imageRoutes } from "./imageRoutes";
import mapRoutes from "./mapRoutes";
import insightsRoutes from "./insights";
import adminSourcesRoutes from "./adminSources";
import chatRoutes from "./chat.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Force JSON response for all API routes (before other middleware)
  app.use('/api/*', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Global middleware
  app.use(corsMiddleware);
  app.use(sessionConfig);
  app.use(generalRateLimit);
  app.use(performanceMonitor.middleware());
  app.use(compression);

  // Initialize administrators
  try {
    await UserService.initializeAdministrators();
  } catch (error) {
    console.error('Failed to initialize administrator:', error);
  }

  // Register modular routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/properties', propertiesRoutes);
  app.use('/api/property-classes', propertyClassesRoutes);
  app.use('/api/regions', regionsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/investment-analytics', investmentAnalyticsRoutes);
  app.use('/api/promocodes', promocodesRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/insights', insightsRoutes);
  app.use('/api/admin/sources', adminSourcesRoutes);
  
  // Import and register admin routes
  const adminRoutes = (await import('./admin.routes')).default;
  app.use('/api/admin', adminRoutes);
  
  // Import and register favorites routes
  const favoritesRoutes = (await import('./favorites.routes')).default;
  app.use('/api/favorites', favoritesRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Scheduler status endpoint (public for debugging)
  app.get('/api/scheduler/status', async (req, res) => {
    try {
      const { schedulerService } = await import('../services/schedulerService');
      const status = schedulerService.getStatus();
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scheduler status'
      });
    }
  });

  // Direct ADS API sync endpoint for testing
  app.post('/api/sync-ads', async (req, res) => {
    try {
      console.log('Manual ADS API sync triggered');
      const { adsApiService } = await import('../services/adsApiService');
      
      const regions = ['Москва', 'Санкт-Петербург'];
      const result = await adsApiService.syncProperties(regions);
      
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Direct regions endpoints to bypass routing conflicts
  const { RegionController } = await import('../controllers/RegionController');
  const regionController = new RegionController();
  
  app.get('/api/regions', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    regionController.getRegions(req, res, next);
  });
  
  app.get('/api/regions/:id', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    regionController.getRegion(req, res, next);
  });

  // Global error handler (must be last middleware)
  app.use(globalErrorHandler);

  const server = createServer(app);
  return server;
}