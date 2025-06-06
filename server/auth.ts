import bcrypt from 'bcryptjs';
import { storage } from './storage';
import type { User } from '@shared/schema';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  telegramHandle?: string;
  referralCode?: string;
}

export class AuthService {
  // Хеширование пароля
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Проверка пароля
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Вход пользователя
  static async login(credentials: AuthCredentials): Promise<User | null> {
    const user = await storage.getUserByEmail(credentials.email);
    
    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await this.verifyPassword(credentials.password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Возвращаем пользователя без пароля
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  // Регистрация пользователя
  static async register(data: RegisterData): Promise<User> {
    // Проверяем, что пользователь не существует
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Проверяем уникальность username
    const existingUsername = await storage.getUserByUsername(data.username);
    if (existingUsername) {
      throw new Error('Пользователь с таким именем уже существует');
    }

    // Хешируем пароль
    const hashedPassword = await this.hashPassword(data.password);

    // Генерируем реферальный код если не предоставлен
    const referralCode = data.referralCode || this.generateReferralCode();

    // Создаем пользователя
    const newUser = await storage.createUser({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      telegramHandle: data.telegramHandle || null,
      referralCode,
      role: 'client',
      bonusBalance: '0.00',
    });

    // Возвращаем пользователя без пароля
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  }

  // Генерация реферального кода
  private static generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Обновление пароля
  static async updatePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    
    if (!user || !user.password) {
      return false;
    }

    const isOldPasswordValid = await this.verifyPassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return false;
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    await storage.updateUser(userId, { password: hashedNewPassword });
    
    return true;
  }
}