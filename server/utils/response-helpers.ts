/**
 * Centralized response helpers for consistent API responses
 */
import { Response } from 'express';
import type { ApiResponse, ApiError, PaginationInfo } from '../types/api';

export class ResponseHelper {
  /**
   * Send successful response with data
   */
  static success<T>(res: Response, data: T, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send successful response with pagination
   */
  static successWithPagination<T>(
    res: Response, 
    data: T, 
    pagination: PaginationInfo,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      pagination
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response, 
    message: string, 
    type: string = 'ERROR',
    statusCode: number = 500,
    details?: Record<string, any>
  ): void {
    const error: ApiError = {
      message,
      type,
      ...(details && { details })
    };

    const response: ApiResponse = {
      success: false,
      error
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send validation error
   */
  static validationError(res: Response, message: string, details?: Record<string, any>): void {
    ResponseHelper.error(res, message, 'VALIDATION_ERROR', 400, details);
  }

  /**
   * Send not found error
   */
  static notFound(res: Response, resource: string = 'Resource'): void {
    ResponseHelper.error(res, `${resource} not found`, 'NOT_FOUND', 404);
  }

  /**
   * Send unauthorized error
   */
  static unauthorized(res: Response, message: string = 'Authentication required'): void {
    ResponseHelper.error(res, message, 'UNAUTHORIZED', 401);
  }

  /**
   * Send forbidden error
   */
  static forbidden(res: Response, message: string = 'Access forbidden'): void {
    ResponseHelper.error(res, message, 'FORBIDDEN', 403);
  }

  /**
   * Calculate pagination info
   */
  static calculatePagination(
    page: number, 
    perPage: number, 
    total: number
  ): PaginationInfo {
    return {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage)
    };
  }

  /**
   * Parse pagination parameters from query
   */
  static parsePagination(query: any): { page: number; perPage: number } {
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.perPage) || 20));
    
    return { page, perPage };
  }
}