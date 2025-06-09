import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { storage } from '../storage';
import { AuthService } from '../auth';
import { TelegramAuthService } from '../services/telegramAuthService';
import { requireSessionAuth, type SessionAuthenticatedRequest } from '../middleware/sessionAuth';

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

// Enhanced rate limiting for authentication
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // maximum 3 registration attempts per 15 minutes per IP
  message: {
    success: false,
    error: 'Слишком много попыток регистрации. Попробуйте через 15 минут.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 5, // maximum 5 login attempts per 15 minutes per IP
  message: {
    success: false,
    error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
});

// Login endpoint with rate limiting
router.post('/login', loginLimiter, async (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
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

// Register endpoint with rate limiting
router.post('/register', registrationLimiter, async (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    console.log('Registration attempt with data:', JSON.stringify(req.body, null, 2));
    
    // Validate input data
    const data = registerSchema.parse(req.body);
    console.log('Validation passed for:', data.email);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      console.log('User already exists:', data.email);
      return res.status(400).json({ 
        success: false, 
        error: 'Пользователь с таким email уже существует' 
      });
    }

    // Check if username already exists
    const existingUsername = await storage.getUserByUsername(data.username);
    if (existingUsername) {
      console.log('Username already exists:', data.username);
      return res.status(400).json({ 
        success: false, 
        error: 'Пользователь с таким именем уже существует' 
      });
    }

    // Register new user
    const user = await AuthService.register(data);
    console.log('User registered successfully:', user.email);
    
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
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', typeof error);
    
    // Handle specific validation errors
    if (error?.issues) {
      return res.status(422).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }
    
    // Handle specific business logic errors
    if (error.message === 'Реферальный код уже используется. Выберите другой код.') {
      console.log('Matched referral code error');
      return res.status(409).json({
        success: false,
        error: 'Реферальный код уже используется. Выберите другой код.'
      });
    }
    
    // Handle duplicate key errors
    if (error.message?.includes('email')) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
    }
    
    if (error.message?.includes('username')) {
      return res.status(409).json({
        success: false,
        error: 'Пользователь с таким именем уже существует'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка регистрации' 
    });
  }
});

// Get user profile
router.get('/profile', requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      });
    }

    const user = await storage.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }

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
    console.error('Profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения профиля' 
    });
  }
});

// Logout endpoint
router.post('/logout', async (req: any, res: any) => {
  res.setHeader('Content-Type', 'application/json');
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

// Telegram Authentication endpoint
router.post('/telegram', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const telegramAuthData = req.body;
    
    const user = await TelegramAuthService.authenticateUser(telegramAuthData);
    
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
    console.error('Telegram auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка авторизации через Telegram'
    });
  }
});

export default router;