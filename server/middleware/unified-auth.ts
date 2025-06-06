/**
 * Unified authentication middleware replacing auth.ts and authMiddleware.ts
 */
import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { ValidationError } from '../utils/errors';
import type { AuthenticatedUser, RequestContext } from '../types/api';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  context?: RequestContext;
}

/**
 * Creates request context with authenticated user information
 */
async function createRequestContext(req: AuthenticatedRequest): Promise<RequestContext> {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    user: req.user,
    requestId,
    timestamp: new Date()
  };
}

/**
 * Extracts user from Replit headers (development) or custom headers (production)
 */
function extractUserFromHeaders(req: Request): { userEmail?: string; replitUser?: any } {
  const userEmail = req.headers['x-user-email'] as string;
  const replitUserId = req.headers['x-replit-user-id'] as string;
  const replitUserName = req.headers['x-replit-user-name'] as string;
  const replitUserRoles = req.headers['x-replit-user-roles'] as string;

  return {
    userEmail,
    replitUser: replitUserId && replitUserName ? {
      id: replitUserId,
      name: replitUserName,
      roles: replitUserRoles || ''
    } : undefined
  };
}

/**
 * Base authentication middleware - adds user context if available
 */
export const addUserContext = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userEmail, replitUser } = extractUserFromHeaders(req);
    
    if (userEmail) {
      const user = await storage.getUserByEmail(userEmail);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role as 'administrator' | 'client',
          subscriptionType: user.subscriptionType || undefined,
          subscriptionExpiresAt: user.subscriptionExpiresAt || undefined
        };
      }
    } else if (replitUser) {
      // For Replit development environment
      req.user = {
        id: parseInt(replitUser.id) || 1,
        email: 'dev@replit.user',
        role: 'administrator' // Default to admin in dev
      };
    }

    req.context = await createRequestContext(req);
    next();
  } catch (error) {
    console.error('User context middleware error:', error);
    next(); // Continue without user context
  }
};

/**
 * Requires authenticated user
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        type: 'UNAUTHORIZED'
      }
    });
  }
  next();
};

/**
 * Requires administrator role
 */
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        type: 'UNAUTHORIZED'
      }
    });
  }

  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Administrator access required',
        type: 'FORBIDDEN'
      }
    });
  }
  next();
};

/**
 * Checks AI quota limits and increments usage
 */
export const checkAIQuota = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required for AI features',
          type: 'UNAUTHORIZED'
        }
      });
    }

    const quotaCheck = await storage.checkAIQuotaLimit(req.user.id);
    
    if (!quotaCheck.canUse) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'AI quota exceeded',
          type: 'QUOTA_EXCEEDED',
          details: {
            dailyLimit: quotaCheck.dailyLimit,
            used: quotaCheck.used
          }
        }
      });
    }

    // Increment usage counter
    await storage.incrementAIUsage(req.user.id);
    next();
  } catch (error) {
    console.error('AI quota check error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to check AI quota',
        type: 'INTERNAL_ERROR'
      }
    });
  }
};

/**
 * Validates required parameters
 */
export const validateParams = (requiredParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredParams.filter(param => !req.params[param]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Missing required parameters: ${missing.join(', ')}`,
          type: 'VALIDATION_ERROR',
          details: { missingParams: missing }
        }
      });
    }
    
    next();
  };
};