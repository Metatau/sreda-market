import { Request, Response, NextFunction } from 'express';

interface RequestWithSession extends Request {
  session?: any;
}

// Special rate limiter for admin operations
export function createAdminRateLimit() {
  const adminStore: { [key: string]: { count: number; resetTime: number } } = {};
  
  // Cleanup expired entries every 10 minutes
  setInterval(() => {
    const now = Date.now();
    Object.keys(adminStore).forEach(key => {
      if (adminStore[key].resetTime < now) {
        delete adminStore[key];
      }
    });
  }, 10 * 60 * 1000);

  return (req: RequestWithSession, res: Response, next: NextFunction) => {
    // Always allow in development
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    // Check if user is authenticated admin
    const session = req.session;
    if (!session?.userId) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required for admin operations' 
      });
      return;
    }

    // Very generous limits for authenticated admin users
    const userId = session.userId.toString();
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 1000; // Very high limit for admin operations

    const userEntry = adminStore[userId];
    
    if (!userEntry || userEntry.resetTime < now) {
      adminStore[userId] = {
        count: 1,
        resetTime: now + windowMs
      };
      next();
      return;
    }

    if (userEntry.count >= maxRequests) {
      const remainingTime = userEntry.resetTime - now;
      const retryAfter = Math.ceil(remainingTime / 1000);
      
      res.status(429).json({
        error: 'Too many admin requests, please wait',
        retryAfter: retryAfter
      });
      return;
    }

    userEntry.count++;
    next();
  };
}

export const adminRateLimitMiddleware = createAdminRateLimit();