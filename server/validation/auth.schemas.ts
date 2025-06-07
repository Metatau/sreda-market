import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов')
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Имя пользователя должно содержать минимум 3 символа'),
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  telegramHandle: z.string().optional(),
  referralCode: z.string().optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Необходимо указать текущий пароль'),
  newPassword: z.string().min(6, 'Новый пароль должен содержать минимум 6 символов')
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;