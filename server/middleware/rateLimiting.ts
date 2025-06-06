import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
  
  checkLimit(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.store[identifier];
    
    if (!entry || entry.resetTime < now) {
      this.store[identifier] = {
        count: 1,
        resetTime: now + windowMs
      };
      return true;
    }
    
    if (entry.count >= limit) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  getRemainingTime(identifier: string): number {
    const entry = this.store[identifier];
    if (!entry) return 0;
    return Math.max(0, entry.resetTime - Date.now());
  }
  
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const rateLimiter = new RateLimiter();

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting completely in development
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }
    
    const identifier = keyGenerator(req);
    
    if (!rateLimiter.checkLimit(identifier, max, windowMs)) {
      const remainingTime = rateLimiter.getRemainingTime(identifier);
      const retryAfter = Math.ceil(remainingTime / 1000);
      
      res.status(429).json({
        error: message,
        retryAfter: retryAfter
      });
      return;
    }
    
    next();
  };
}

// Predefined rate limiters
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // requests per window
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // more restrictive for auth endpoints
  message: 'Too many authentication attempts, please try again later'
});

export const aiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // AI requests are expensive
  message: 'Too many AI requests, please wait before trying again',
  keyGenerator: (req: Request) => {
    // Use user ID if available, otherwise fall back to IP
    const userId = req.headers['x-replit-user-id'] as string;
    return userId || req.ip || 'unknown';
  }
});

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // API calls
  message: 'Too many API requests, please slow down'
});

export const mapRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2000, // Extremely high limits for map functionality
  message: 'Too many map requests, please slow down'
});

// Cleanup on process exit
process.on('SIGTERM', () => rateLimiter.destroy());
process.on('SIGINT', () => rateLimiter.destroy());