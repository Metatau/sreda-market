import { storage } from '../storage';
import { nanoid } from 'nanoid';

export class UserService {
  // Создание администраторов при первом запуске
  static async initializeAdministrators() {
    try {
      await this.createAdminIfNotExists({
        email: 'saabox@yandex.ru',
        username: 'admin',
        telegramHandle: '@metatau',
        firstName: 'Администратор',
        lastName: 'Системы'
      });

      await this.createAdminIfNotExists({
        email: 'monostud.io@yandex.ru',
        username: 'studiomono',
        telegramHandle: '@studiomono',
        firstName: 'Studio',
        lastName: 'Mono'
      });

    } catch (error) {
      console.error('Error initializing administrators:', error);
      throw error;
    }
  }

  private static async createAdminIfNotExists(adminData: {
    email: string;
    username: string;
    telegramHandle: string;
    firstName: string;
    lastName: string;
  }) {
    const existingAdmin = await storage.getUserByEmail(adminData.email);
    if (existingAdmin) {
      console.log(`Administrator ${adminData.email} already exists`);
      return existingAdmin;
    }

    const admin = await storage.createUser({
      username: adminData.username,
      email: adminData.email,
      role: 'administrator',
      telegramHandle: adminData.telegramHandle,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      referralCode: nanoid(8),
      bonusBalance: '0.00'
    });

    console.log('Administrator created successfully:', admin.email);
    return admin;
  }

  // Проверка и обновление подписки пользователя
  static async checkSubscriptionStatus(userId: number): Promise<{
    isActive: boolean;
    type: string | null;
    expiresAt: Date | null;
    daysLeft: number;
  }> {
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Администратор имеет безлимитный доступ
    if (user.role === 'administrator') {
      return {
        isActive: true,
        type: 'unlimited',
        expiresAt: null,
        daysLeft: -1
      };
    }

    const now = new Date();
    const expiresAt = user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
    
    if (!expiresAt || now > expiresAt) {
      return {
        isActive: false,
        type: null,
        expiresAt: null,
        daysLeft: 0
      };
    }

    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isActive: true,
      type: user.subscriptionType,
      expiresAt,
      daysLeft
    };
  }

  // Получение лимитов AI для пользователя
  static async getAILimits(userId: number): Promise<{
    dailyLimit: number;
    used: number;
    canUse: boolean;
    resetTime: Date;
  }> {
    const quotaCheck = await storage.checkAIQuotaLimit(userId);
    const user = await storage.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const resetTime = new Date(user.lastAiQueryReset || new Date());
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    return {
      dailyLimit: quotaCheck.dailyLimit,
      used: quotaCheck.used,
      canUse: quotaCheck.canUse,
      resetTime
    };
  }
}