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
import analyticsRoutes from "./analytics.routes";
import { imageRoutes } from "./imageRoutes";
import mapRoutes from "./mapRoutes";
import insightsRoutes from "./insights";
import adminSourcesRoutes from "./adminSources";

export async function registerRoutes(app: Express): Promise<Server> {
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
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/insights', insightsRoutes);
  app.use('/api/admin/sources', adminSourcesRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Global error handler
  app.use(globalErrorHandler);

  const server = createServer(app);

  // Setup Vite for frontend routing (must be after API routes and server creation)
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("../vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("../vite");
    serveStatic(app);
  }

  return server;
}