import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    role: 'administrator' | 'client';
    subscriptionType?: string;
    subscriptionExpiresAt?: Date;
  };
}

interface AuthOptions {
  required?: boolean;
  roles?: Array<'administrator' | 'client'>;
}

export function createUnifiedAuth(options: AuthOptions = {}) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Приоритет 1: email из заголовка (для Telegram auth)
      let userEmail = req.headers['x-user-email'] as string;
      
      // Приоритет 2: сессионная аутентификация (для веб-интерфейса)
      if (!userEmail && (req as any).session?.userId) {
        const sessionUser = await storage.getUserById((req as any).session.userId);
        if (sessionUser) {
          userEmail = sessionUser.email;
        }
      }
      
      if (!userEmail) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: {
              message: 'Authentication required',
              type: 'AUTH_REQUIRED'
            }
          });
        }
        return next();
      }

      // Получаем пользователя из базы данных
      const user = await storage.getUserByEmail(userEmail);
      
      if (!user) {
        if (options.required) {
          return res.status(401).json({
            success: false,
            error: {
              message: 'User not found',
              type: 'USER_NOT_FOUND'
            }
          });
        }
        return next();
      }

      // Проверяем роли если указаны
      if (options.roles && !options.roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            type: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }

      // Добавляем пользователя в request
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        subscriptionType: user.subscriptionType || undefined,
        subscriptionExpiresAt: user.subscriptionExpiresAt || undefined
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Authentication service error',
          type: 'AUTH_SERVICE_ERROR'
        }
      });
    }
  };
}

// AI Quota middleware
export function checkAIQuota(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // В рамках унифицированной системы проверка квот будет выполняться в контроллерах
  // Этот middleware остается для совместимости
  next();
}

// Предустановленные middleware
export const requireAuth = createUnifiedAuth({ required: true });
export const requireRoleAuth = createUnifiedAuth({ required: true, roles: ['administrator', 'client'] });
export const requireAdmin = createUnifiedAuth({ required: true, roles: ['administrator'] });
export const optionalAuth = createUnifiedAuth({ required: false });