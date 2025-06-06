/**
 * Unified API response types for consistent communication
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: PaginationInfo;
}

export interface ApiError {
  message: string;
  type: string;
  code?: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
}

export interface PaginationInfo {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface RequestContext {
  user?: AuthenticatedUser;
  requestId: string;
  timestamp: Date;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: 'administrator' | 'client';
  subscriptionType?: string;
  subscriptionExpiresAt?: Date;
}

export type RouteHandler<T = any> = (
  req: any,
  res: any,
  context: RequestContext
) => Promise<ApiResponse<T>>;