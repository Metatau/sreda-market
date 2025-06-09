import { Router } from 'express';
import { storage } from '../storage';
import { requireSessionAuth, type SessionAuthenticatedRequest } from '../middleware/sessionAuth';
import { UserService } from '../services/userService';
import { generalRateLimit } from '../middleware/rateLimiting';
import { AuthService } from '../auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  telegramHandle: z.string().optional(),
  referralCode: z.string().optional()
});

// Login endpoint
router.post('/login', generalRateLimit, async (req: any, res: any) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await AuthService.login({ email, password });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный email или пароль' 
      });
    }

    // Set session and save it
    req.session.userId = user.id;
    await new Promise((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка авторизации' 
    });
  }
});

// Register endpoint
router.post('/register', generalRateLimit, async (req: any, res: any) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Пользователь с таким email уже существует' 
      });
    }

    const user = await AuthService.register(data);
    
    // Set session and save it
    req.session.userId = user.id;
    await new Promise((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка регистрации' 
    });
  }
});

// Logout endpoint
router.post('/logout', async (req: any, res: any) => {
  try {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          error: 'Ошибка при выходе' 
        });
      }
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при выходе' 
    });
  }
});

// Get user profile with session authentication
router.get('/profile',
  generalRateLimit,
  requireSessionAuth,
  async (req: SessionAuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const subscriptionStatus = await UserService.checkSubscriptionStatus(user.id);
      const aiLimits = await UserService.getAILimits(user.id);

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        telegramHandle: user.telegramHandle,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        bonusBalance: user.bonusBalance,
        subscription: subscriptionStatus,
        aiLimits
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;