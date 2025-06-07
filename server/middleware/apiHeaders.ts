import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure API routes always return JSON content type
 * and prevent Vite from intercepting API requests in browser
 */
export function apiHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to API routes
  if (req.path.startsWith('/api/')) {
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    // Add headers to prevent caching and ensure fresh responses
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add CORS headers for development
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }
  
  next();
}