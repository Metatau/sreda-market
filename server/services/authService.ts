import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { generateToken } from '../middleware/secureAuth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static async login(email: string, password: string): Promise<{ user: any; token: string }> {
    // Validate input
    const validatedData = loginSchema.parse({ email, password });

    // Find user by email
    const user = await storage.getUserByEmail(validatedData.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(validatedData.password, user.password || '');
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword,
      token,
    };
  }

  static async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ user: any; token: string }> {
    // Validate input
    const validatedData = registerSchema.parse(userData);

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(validatedData.password);

    // Generate referral code
    const referralCode = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user
    const newUser = await storage.createUser({
      username: validatedData.username,
      email: validatedData.email,
      password: hashedPassword,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      role: 'client',
      referralCode,
      bonusBalance: '0.00',
      subscriptionType: null,
      subscriptionExpiresAt: null,
      isActive: true,
    });

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    return {
      user: userWithoutPassword,
      token,
    };
  }

  static async refreshToken(userId: number): Promise<string> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
}