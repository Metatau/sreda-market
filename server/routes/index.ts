import type { Express } from "express";
import { createServer, type Server } from "http";
import { corsMiddleware } from "../middleware/cors";
import { sessionConfig } from "../middleware/sessionAuth";
import { generalRateLimit } from "../middleware/rateLimiting";
import { performanceMonitor } from "../services/performanceService";
import { compression } from "../middleware/cache";
import { globalErrorHandler } from "../utils/errors";
import { UserService } from "../services/userService";
import { apiHeadersMiddleware } from "../middleware/apiHeaders";

// Import modular routes
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import propertiesRoutes from "./properties.routes";
import analyticsRoutes from "./analytics.routes";
import regionsRoutes from "./regions.routes";
import propertyClassesRoutes from "./property-classes.routes";
import { imageRoutes } from "./imageRoutes";
import mapRoutes from "./mapRoutes";
import insightsRoutes from "./insights";
import adminSourcesRoutes from "./adminSources";
import promocodesRoutes from "./promocodes.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Global middleware
  app.use(corsMiddleware);
  app.use(sessionConfig);
  app.use(generalRateLimit);
  app.use(performanceMonitor.middleware());
  app.use(compression);
  app.use(apiHeadersMiddleware);

  // Initialize administrators
  try {
    await UserService.initializeAdministrators();
  } catch (error) {
    console.error('Failed to initialize administrator:', error);
  }

  // Register modular routes BEFORE Vite setup
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/properties', propertiesRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/regions', regionsRoutes);
  app.use('/api/property-classes', propertyClassesRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/insights', insightsRoutes);
  app.use('/api/admin/sources', adminSourcesRoutes);
  app.use('/api/promocodes', promocodesRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Test page for API demonstration
  app.get('/test', (req, res) => {
    const path = await import('path');
    res.sendFile(path.resolve(import.meta.dirname, '../client/public/test.html'));
  });

  // Ensure API routes always return JSON (after routes registration)
  app.use('/api/*', (req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, error: { message: 'API endpoint not found' } });
    }
  });

  const server = createServer(app);
  
  // Setup Vite for frontend routing (must be after API routes)
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("../vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("../vite");
    serveStatic(app);
  }

  // Global error handler
  app.use(globalErrorHandler);

  return server;
}