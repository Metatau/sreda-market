import crypto from 'crypto';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export class TelegramAuthService {
  private static BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  // Проверка подлинности данных от Telegram
  static verifyTelegramAuth(authData: TelegramAuthData): boolean {
    if (!this.BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const { hash, ...data } = authData;
    
    // Создаем строку для проверки подписи
    const dataCheckString = Object.keys(data)
      .sort()
      .map(key => `${key}=${(data as any)[key]}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHash('sha256')
      .update(this.BOT_TOKEN)
      .digest();

    // Создаем подпись
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return signature === hash;
  }

  // Проверка актуальности данных (не старше 1 часа)
  static isAuthDataFresh(authDate: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return (now - authDate) <= 3600; // 1 час
  }

  // Аутентификация пользователя через Telegram
  static async authenticateUser(authData: TelegramAuthData) {
    // Проверяем подлинность данных
    if (!this.verifyTelegramAuth(authData)) {
      throw new Error('Invalid Telegram authentication data');
    }

    // Проверяем актуальность
    if (!this.isAuthDataFresh(authData.auth_date)) {
      throw new Error('Authentication data is too old');
    }

    const telegramId = authData.id.toString();
    
    // Ищем существующего пользователя по Telegram ID
    const existingUser = await storage.getUserByTelegramId(telegramId);
    
    if (existingUser) {
      // Обновляем информацию пользователя
      const updatedUser = await storage.updateUser(existingUser.id, {
        firstName: authData.first_name,
        lastName: authData.last_name || null,
        profileImageUrl: authData.photo_url || null,
      });
      
      return updatedUser;
    }

    // Создаем нового пользователя
    const newUser = await storage.createUser({
      username: authData.username || `user_${authData.id}`,
      email: `${authData.id}@telegram.local`, // Временный email
      firstName: authData.first_name,
      lastName: authData.last_name || null,
      profileImageUrl: authData.photo_url || null,
      telegramId: telegramId,
      telegramHandle: authData.username ? `@${authData.username}` : null,
      role: 'client',
      referralCode: nanoid(8),
      bonusBalance: '0.00'
    });

    return newUser;
  }

  // Генерация URL для Telegram Login Widget
  static generateTelegramLoginUrl(redirectUrl: string): string {
    if (!this.BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      throw new Error('TELEGRAM_BOT_USERNAME not configured');
    }

    const params = new URLSearchParams({
      size: 'large',
      auth_url: redirectUrl,
      request_access: 'write'
    });

    return `https://oauth.telegram.org/auth?bot_id=${this.getBotId()}&origin=${encodeURIComponent(redirectUrl)}&${params}`;
  }

  private static getBotId(): string {
    if (!this.BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }
    
    return this.BOT_TOKEN.split(':')[0];
  }
}