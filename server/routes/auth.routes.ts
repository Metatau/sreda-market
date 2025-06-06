/**
 * Authentication routes - extracted from monolithic routes.ts
 */
import { Router } from 'express';
import { UserService } from '../services/userService';
import { TelegramAuthService } from '../services/telegramAuthService';
import { addUserContext, requireAuth } from '../middleware/unified-auth';
import { ResponseHelper } from '../utils/response-helpers';
import { handleAsyncError } from '../utils/errors';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

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

// Временное хранилище токенов авторизации
const authTokens = new Map<string, { status: 'pending' | 'completed' | 'expired', user?: any, timestamp: number }>();

// Очистка истекших токенов каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of authTokens.entries()) {
    if (now - data.timestamp > 300000) { // 5 минут
      authTokens.delete(token);
    }
  }
}, 300000);

/**
 * GET /api/auth/telegram/check/:token - Проверка статуса авторизации по токену
 */
router.get('/telegram/check/:token', handleAsyncError(async (req, res) => {
  const { token } = req.params;
  const authData = authTokens.get(token);

  if (!authData) {
    return ResponseHelper.error(res, 'Invalid or expired token', 400);
  }

  if (authData.status === 'completed' && authData.user) {
    // Удаляем токен после успешной авторизации
    authTokens.delete(token);
    return ResponseHelper.success(res, { success: true, user: authData.user });
  }

  if (authData.status === 'expired') {
    authTokens.delete(token);
    return ResponseHelper.error(res, 'Authorization expired', 400);
  }

  // Статус pending - авторизация еще не завершена
  ResponseHelper.success(res, { success: false, pending: true });
}));

/**
 * POST /api/auth/telegram/webhook - Webhook для обработки команд от Telegram бота
 */
router.post('/telegram/webhook', handleAsyncError(async (req, res) => {
  const update = req.body;
  
  if (update.message && update.message.text && update.message.text.startsWith('/start auth_')) {
    const token = update.message.text.replace('/start auth_', '');
    const user = update.message.from;
    
    // Создаем или обновляем пользователя
    const telegramId = user.id.toString();
    let dbUser = await storage.getUserByTelegramId(telegramId);
    
    if (!dbUser) {
      dbUser = await storage.createUser({
        email: `telegram_${telegramId}@sreda.market`,
        firstName: user.first_name || 'Пользователь',
        lastName: user.last_name || null,
        profileImageUrl: null,
        telegramId: telegramId,
        telegramHandle: user.username ? `@${user.username}` : null,
        role: 'client',
        referralCode: nanoid(8),
        bonusBalance: '0.00'
      });
    }
    
    // Отмечаем авторизацию как завершенную
    authTokens.set(token, {
      status: 'completed',
      user: dbUser,
      timestamp: Date.now()
    });
    
    // Отправляем подтверждение в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.id,
          text: '✅ Авторизация успешно завершена! Вы можете вернуться к платформе SREDA Market.'
        })
      });
    }
  }
  
  ResponseHelper.success(res, { ok: true });
}));

/**
 * POST /api/auth/telegram/init - Инициализация токена авторизации
 */
router.post('/telegram/init', (req, res) => {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  authTokens.set(token, {
    status: 'pending',
    timestamp: Date.now()
  });
  
  ResponseHelper.success(res, { token });
});

export default router;