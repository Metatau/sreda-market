
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (config.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

export function rateLimiter(windowMs: number = 15 * 60 * 1000, max: number = 100) {
  const requests = new Map<string, { count: number; reset: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const now = Date.now();
    const window = requests.get(ip);
    
    if (!window || now > window.reset) {
      requests.set(ip, { count: 1, reset: now + windowMs });
      return next();
    }
    
    if (window.count >= max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    window.count++;
    next();
  };
}
