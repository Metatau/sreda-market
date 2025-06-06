import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
  'http://localhost:5000',
  'https://localhost:5000',
  process.env.REPLIT_DOMAIN ? `https://${process.env.REPLIT_DOMAIN}` : null,
  process.env.FRONTEND_URL || null
].filter(Boolean) as string[];

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Allow requests without origin (mobile apps, curl, etc.)
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-email, x-replit-user-id, x-replit-user-name, x-replit-user-roles');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};