import { Request, Response, NextFunction } from 'express';
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

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Временная проверка - в реальном проекте будет проверка JWT или сессии
    const userEmail = req.headers['x-user-email'] as string;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: No user email provided' });
    }

    const user = await storage.getUserByEmail(userEmail);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'administrator') {
      return res.status(403).json({ error: 'Forbidden: Administrator access required' });
    }
    next();
  });
};

export const checkAIQuota = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const quotaCheck = await storage.checkAIQuotaLimit(req.user.id);
    
    if (!quotaCheck.canUse) {
      return res.status(429).json({ 
        error: 'AI quota exceeded',
        dailyLimit: quotaCheck.dailyLimit,
        used: quotaCheck.used
      });
    }

    // Увеличиваем счетчик использования
    await storage.incrementAIUsage(req.user.id);
    
    next();
  } catch (error) {
    console.error('AI quota check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};