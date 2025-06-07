import { Router } from 'express';
import { AuthService } from '../auth';
import { requireAuth } from '../middleware/unifiedAuth';
import { validateBody } from '../validation/schemas';
import { loginSchema, registerSchema, changePasswordSchema } from '../validation/auth.schemas';
import { generalRateLimit, authRateLimit } from '../middleware/rateLimiting';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Регистрация
router.post('/register',
  authRateLimit,
  validateBody(registerSchema as any),
  async (req, res) => {
    try {
      const userData = req.body;
      const user = await AuthService.register(userData);
      
      // Автоматическая авторизация после регистрации
      req.session.userId = user.id;
      req.session.save();

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: { message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { message: 'Registration failed' }
      });
    }
  }
);

// Авторизация
router.post('/login',
  authRateLimit,
  validateBody(loginSchema as any),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await AuthService.login({ email, password });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid credentials' }
        });
      }

      req.session.userId = user.id;
      req.session.save();

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Login failed' }
      });
    }
  }
);

// Выход
router.post('/logout',
  generalRateLimit,
  (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          success: false,
          error: { message: 'Logout failed' }
        });
      }

      res.clearCookie('connect.sid');
      res.json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    });
  }
);

// Проверка статуса авторизации
router.get('/status',
  generalRateLimit,
  (req, res) => {
    if (req.session.userId) {
      res.json({
        success: true,
        data: { 
          authenticated: true,
          userId: req.session.userId 
        }
      });
    } else {
      res.json({
        success: true,
        data: { authenticated: false }
      });
    }
  }
);

// Получение профиля пользователя
router.get('/profile',
  generalRateLimit,
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch profile' }
      });
    }
  }
);

// Смена пароля
router.post('/change-password',
  authRateLimit,
  requireAuth,
  validateBody(changePasswordSchema as any),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const success = await AuthService.updatePassword(
        req.user!.id, 
        oldPassword, 
        newPassword
      );

      if (!success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid current password' }
        });
      }

      res.json({
        success: true,
        data: { message: 'Password updated successfully' }
      });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Password change failed' }
      });
    }
  }
);

export default router;