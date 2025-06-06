/**
 * Temporary bridge to original routes during refactoring
 * This file will be removed once refactoring is complete
 */
import { Express } from 'express';
import { createServer, type Server } from 'http';

export async function registerRoutes(app: Express): Promise<Server> {
  // Import original routes to maintain functionality
  const { registerRoutes: originalRegisterRoutes } = await import('../routes');
  return await originalRegisterRoutes(app);
}

