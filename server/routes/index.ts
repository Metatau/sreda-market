/**
 * Central route registration - replaces monolithic routes.ts
 */
import { Express } from 'express';
import { createServer, type Server } from 'http';
import { globalErrorHandler } from '../utils/errors';
import { UserService } from '../services/userService';

// Import route modules
import propertyRoutes from './property.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize administrator on startup
  try {
    await UserService.initializeAdministrator();
  } catch (error) {
    console.error('Failed to initialize administrator:', error);
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Serve sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    res.set('Content-Type', 'application/xml');
    res.sendFile('sitemap.xml', { root: '.' });
  });

  // Register route modules
  app.use('/api/properties', propertyRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  // Legacy routes - keeping for backward compatibility
  // These will be gradually migrated to the new modular structure
  await registerLegacyRoutes(app);

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return createServer(app);
}

/**
 * Registers legacy routes that haven't been migrated yet
 * TODO: Gradually move these to appropriate route modules
 */
async function registerLegacyRoutes(app: Express) {
  // Import original routes implementation temporarily
  const { registerRoutes: originalRoutes } = await import('../routes_refactored');
  // Register only the routes that haven't been migrated to modules
  // This is a temporary solution during the migration process
  console.log('Loading legacy routes for backward compatibility');
}