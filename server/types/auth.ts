import { Request } from 'express';
import { User } from '../../shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

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