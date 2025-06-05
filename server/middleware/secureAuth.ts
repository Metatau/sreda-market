import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { storage } from '../storage';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'administrator' | 'client';
    subscriptionType?: string;
    subscriptionExpiresAt?: Date;
  };
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: 'administrator' | 'client';
  iat: number;
  exp: number;
}

export const generateToken = (user: { id: number; email: string; role: string }): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    config.JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'real-estate-marketplace',
      audience: 'real-estate-app'
    }
  );
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.JWT_SECRET, {
    issuer: 'real-estate-marketplace',
    audience: 'real-estate-app'
  }) as JWTPayload;
};

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No valid authentication token provided'
      });
    }

    const token = authHeader.substring(7);
    
    let decoded: JWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Verify user still exists and is active
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as 'administrator' | 'client',
      subscriptionType: user.subscriptionType || undefined,
      subscriptionExpiresAt: user.subscriptionExpiresAt || undefined
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Authentication failed due to server error'
    });
  }
};

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'administrator') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Administrator access required'
      });
    }
    next();
  });
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = verifyToken(token);
        const user = await storage.getUser(decoded.userId);
        
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role as 'administrator' | 'client',
            subscriptionType: user.subscriptionType || undefined,
            subscriptionExpiresAt: user.subscriptionExpiresAt || undefined
          };
        }
      } catch (error) {
        // Invalid token, but that's ok for optional auth
        console.log('Optional auth failed:', error);
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if auth fails
  }
};

export const checkAIQuota = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required for AI features'
      });
    }

    const quotaCheck = await storage.checkAIQuotaLimit(req.user.id);
    
    if (!quotaCheck.canUse) {
      return res.status(429).json({ 
        error: 'AI quota exceeded',
        message: 'Daily AI usage limit reached',
        dailyLimit: quotaCheck.dailyLimit,
        used: quotaCheck.used
      });
    }

    // Increment usage counter
    await storage.incrementAIUsage(req.user.id);
    
    next();
  } catch (error) {
    console.error('AI quota check error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to check AI quota'
    });
  }
};