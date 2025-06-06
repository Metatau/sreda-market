import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { storage } from '../storage';
import { AuthService } from '../auth';

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
router.post('/login', async (req: any, res: any) => {
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
    if (req.session) {
      req.session.userId = user.id;
    }
    
    res.json({
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
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка авторизации' 
    });
  }
});

// Register endpoint
router.post('/register', async (req: any, res: any) => {
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
    if (req.session) {
      req.session.userId = user.id;
    }
    
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

// Telegram authentication endpoint
router.post('/telegram', async (req: any, res: any) => {
  try {
    const telegramData = req.body;
    console.log('Received Telegram auth data:', telegramData);

    // Check required fields
    if (!telegramData.id || !telegramData.first_name) {
      return res.status(400).json({
        success: false,
        error: "Недостаточно данных от Telegram"
      });
    }

    // Verify Telegram data authenticity
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && telegramData.hash) {
      const { hash, ...dataToCheck } = telegramData;
      
      const dataCheckString = Object.keys(dataToCheck)
        .sort()
        .map(key => `${key}=${dataToCheck[key]}`)
        .join('\n');
      
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
      
      if (hmac !== hash) {
        return res.status(401).json({
          success: false,
          error: "Неверная подпись данных от Telegram"
        });
      }
    }

    // Create user data based on Telegram
    const telegramId = telegramData.id.toString();
    const username = telegramData.username || `user_${telegramId}`;
    const firstName = telegramData.first_name;
    const lastName = telegramData.last_name || '';
    const email = `telegram_${telegramId}@sreda.market`;

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
    if (req.session) {
      req.session.userId = user.id;
    }

    res.json({
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
    console.error('Telegram auth error:', error);
    res.status(500).json({
      success: false,
      error: "Ошибка авторизации через Telegram"
    });
  }
});

// Logout endpoint
router.post('/logout', (req: any, res: any) => {
  if (req.session) {
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
  } else {
    res.json({ success: true });
  }
});

// Status endpoint
router.get('/status', async (req: any, res: any) => {
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
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка проверки статуса' 
    });
  }
});

export default router;