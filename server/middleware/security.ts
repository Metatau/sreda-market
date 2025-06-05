import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI endpoints rate limiting
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 AI requests per minute
  message: {
    error: 'Too many AI requests',
    message: 'Please slow down your requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  // Basic request validation
  if (req.body && typeof req.body === 'object') {
    // Remove any potential XSS attempts
    const cleanBody = JSON.parse(JSON.stringify(req.body));
    req.body = cleanBody;
  }
  
  next();
};

// CORS middleware
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = config.NODE_ENV === 'production' 
    ? ['https://your-domain.replit.app'] // Replace with actual domain
    : ['http://localhost:5000', 'http://127.0.0.1:5000'];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin || '')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Email');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
};