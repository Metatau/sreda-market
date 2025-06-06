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
 * POST /api/auth/telegram - Handle Telegram authentication
 */
router.post('/telegram', handleAsyncError(async (req, res) => {
  const { id, username, first_name, last_name, auth_date, hash } = req.body;

  if (!id || !hash) {
    return ResponseHelper.validationError(res, 'Missing required Telegram authentication data');
  }

  try {
    const user = await TelegramAuthService.authenticateUser({
      id: parseInt(id),
      username,
      first_name,
      last_name,
      auth_date: parseInt(auth_date),
      hash
    });

    ResponseHelper.success(res, {
      user,
      authenticated: true,
      message: 'Successfully authenticated with Telegram'
    });
  } catch (error) {
    console.error('Telegram authentication error:', error);
    ResponseHelper.error(res, 'Failed to authenticate with Telegram', 'TELEGRAM_AUTH_ERROR', 401);
  }
}));

export default router;