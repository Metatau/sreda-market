import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Extend Express Request type for session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: 'administrator' | 'client';
    firstName?: string | null;
    lastName?: string | null;
  };
}

// Authentication middleware
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация'
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as 'administrator' | 'client',
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка авторизации'
    });
  }
};

// Admin role requirement middleware
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Требуются права администратора'
      });
    }
    next();
  });
};

// Role-based authentication middleware
export const requireRoleAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  await requireAuth(req, res, next);
};