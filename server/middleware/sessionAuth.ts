import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { storage } from '../storage';
import { config } from '../config';

const MemoryStoreSession = MemoryStore(session);

// Extend Express Request type for session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export interface SessionAuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: 'administrator' | 'client';
    firstName?: string | null;
    lastName?: string | null;
  };
}

// Session configuration
export const sessionConfig = session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Session-based authentication middleware
export const requireSessionAuth = async (req: SessionAuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Session debug:', {
      sessionId: req.sessionID,
      session: req.session,
      userId: req.session?.userId,
      cookies: req.headers.cookie
    });
    
    const userId = req.session?.userId;
    
    if (!userId) {
      console.log('No userId in session, rejecting request');
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          type: 'AUTH_REQUIRED'
        }
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          type: 'USER_NOT_FOUND'
        }
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
    console.error('Session authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication service error',
        type: 'AUTH_SERVICE_ERROR'
      }
    });
  }
};