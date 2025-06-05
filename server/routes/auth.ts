import { Router } from 'express';
import { AuthService } from '../services/authService';
import { TelegramAuthService } from '../services/telegramAuthService';
import { authRateLimit } from '../middleware/security';
import { z } from 'zod';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password);
    
    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message || 'Invalid credentials'
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    
    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({
      error: 'Registration failed',
      message: error.message || 'Failed to create account'
    });
  }
});

// Telegram authentication endpoint
router.post('/telegram', async (req, res) => {
  try {
    const telegramAuthData = req.body;
    
    const user = await TelegramAuthService.authenticateUser(telegramAuthData);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        telegramHandle: user.telegramHandle,
        profileImageUrl: user.profileImageUrl
      }
    });
  } catch (error: any) {
    console.error('Telegram authentication error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Telegram authentication failed' 
    });
  }
});

// Telegram bot configuration endpoint
router.get('/telegram/config', (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    
    if (!botToken || !botUsername) {
      return res.status(500).json({ 
        error: 'Telegram bot configuration missing',
        message: 'Please configure TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME'
      });
    }
    
    const botId = botToken.split(':')[0];
    
    res.json({
      botId,
      botUsername: botUsername.replace('@', ''),
      domain: req.get('host')
    });
  } catch (error) {
    console.error('Error getting Telegram config:', error);
    res.status(500).json({ 
      error: 'Configuration error',
      message: 'Failed to get Telegram configuration' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ 
    success: true,
    message: 'Logged out successfully'
  });
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'User ID is required'
      });
    }

    const token = await AuthService.refreshToken(userId);
    
    res.json({
      success: true,
      token
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message || 'Failed to refresh token'
    });
  }
});

export default router;