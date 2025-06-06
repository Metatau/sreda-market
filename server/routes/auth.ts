import { Router, Request } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { storage } from '../storage';
import { AuthService } from '../auth';

// Extend Request type for session
interface RequestWithSession extends Request {
  session: any;
}

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  telegramHandle: z.string().optional(),
  referralCode: z.string().optional()
});

const telegramAuthSchema = z.object({
  initDataRaw: z.string(),
  hash: z.string()
});

// Helper function to verify Telegram signature
function verifyTelegramSignature(initDataRaw: string, hash: string): boolean {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN not configured');
  }

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();

  const dataCheckString = new URLSearchParams(initDataRaw)
    .toString()
    .split('&')
    .filter(item => !item.startsWith('hash='))
    .sort()
    .join('\n');

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}

// Login endpoint
router.post('/login', async (req: RequestWithSession, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await AuthService.login({ email, password });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный email или пароль' 
      });
    }

    // Set session
    req.session.userId = user.id;
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверные данные для входа' 
      });
    }
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера' 
    });
  }
});

// Register endpoint
router.post('/register', async (req: RequestWithSession, res) => {
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
    
    // Set session
    req.session.userId = user.id;
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверные данные для регистрации' 
      });
    }
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера' 
    });
  }
});

// Telegram authentication endpoint
router.post('/telegram', async (req: RequestWithSession, res) => {
  try {
    const { initDataRaw, hash } = telegramAuthSchema.parse(req.body);
    
    // Verify Telegram signature
    if (!verifyTelegramSignature(initDataRaw, hash)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверная подпись Telegram' 
      });
    }

    // Parse Telegram data
    const urlParams = new URLSearchParams(initDataRaw);
    const userDataStr = urlParams.get('user');
    
    if (!userDataStr) {
      return res.status(400).json({ 
        success: false, 
        error: 'Данные пользователя не найдены' 
      });
    }

    const userData = JSON.parse(userDataStr);
    const telegramId = userData.id.toString();
    const username = userData.username || `user_${telegramId}`;
    const firstName = userData.first_name;
    const lastName = userData.last_name;
    const email = `${username}@telegram.local`;

    // Find or create user
    let user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      user = await storage.createUser({
        username,
        email,
        password: '', // Empty password for Telegram users
        firstName,
        lastName,
        telegramId,
        role: 'client',
        referralCode: ''
      });
    }

    // Set session
    req.session.userId = user.id;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Неверные данные Telegram' 
      });
    }
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка сервера' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req: RequestWithSession, res) => {
  req.session.destroy((err: any) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при выходе' 
      });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Status endpoint
router.get('/status', async (req: RequestWithSession, res) => {
  const userId = req.session?.userId;
  
  if (!userId) {
    return res.json({ authenticated: false });
  }

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.json({ authenticated: false });
  }
});

export default router;