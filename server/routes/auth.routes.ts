/**
 * Authentication routes - extracted from monolithic routes.ts
 */
import { Router } from 'express';
import { UserService } from '../services/userService';
import { TelegramAuthService } from '../services/telegramAuthService';
import { addUserContext, requireAuth } from '../middleware/unified-auth';
import { ResponseHelper } from '../utils/response-helpers';
import { handleAsyncError } from '../utils/errors';

const router = Router();

// Apply user context to all auth routes
router.use(addUserContext);

/**
 * GET /api/auth/status - Check authentication status
 */
router.get('/status', (req, res) => {
  const userId = req.headers['x-replit-user-id'];
  const userName = req.headers['x-replit-user-name'];
  const userRoles = req.headers['x-replit-user-roles'];

  if (userId && userName) {
    ResponseHelper.success(res, {
      authenticated: true,
      userId,
      userName,
      userRoles: userRoles || '',
    });
  } else {
    ResponseHelper.success(res, { authenticated: false });
  }
});

/**
 * GET /api/auth/telegram/config - Get Telegram bot configuration
 */
router.get('/telegram/config', handleAsyncError(async (req, res) => {
  const config = await TelegramAuthService.getBotConfig();
  ResponseHelper.success(res, config);
}));

/**
 * GET /api/auth/telegram - Handle Telegram authentication callback
 */
router.get('/telegram', handleAsyncError(async (req, res) => {
  const { id, username, first_name, last_name, auth_date, hash } = req.query;

  if (!id || !hash) {
    return res.redirect('/?error=telegram_auth_failed');
  }

  try {
    const user = await TelegramAuthService.authenticateUser({
      id: parseInt(id as string),
      username: username as string,
      first_name: first_name as string,
      last_name: last_name as string,
      auth_date: parseInt(auth_date as string),
      hash: hash as string
    });

    // Успешная аутентификация - перенаправляем на главную страницу
    res.redirect('/?telegram_auth=success');
  } catch (error) {
    console.error('Telegram authentication error:', error);
    res.redirect('/?error=telegram_auth_failed');
  }
}));

export default router;