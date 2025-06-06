
import { Request, Response } from "express";
import { ResponseHelper } from "../utils/response-helpers";
import { ValidationService } from "../services/ValidationService";
import type { AuthenticatedRequest } from "../middleware/unified-auth";

export abstract class BaseController {
  /**
   * Send successful response
   */
  protected sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    ResponseHelper.success(res, data, statusCode);
  }

  /**
   * Send error response
   */
  protected sendError(res: Response, message: string, type: string = 'ERROR', statusCode: number = 500): void {
    ResponseHelper.error(res, message, type, statusCode);
  }

  /**
   * Validate ID parameter
   */
  protected validateId(id: string, fieldName: string = 'ID'): number {
    return ValidationService.validateId(id, fieldName);
  }

  /**
   * Validate pagination parameters
   */
  protected validatePagination(page?: string, perPage?: string) {
    return ValidationService.validatePagination(page, perPage);
  }

  /**
   * Get authenticated user from request
   */
  protected getAuthenticatedUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    return req.user;
  }

  /**
   * Check if user is admin
   */
  protected requireAdmin(req: AuthenticatedRequest) {
    const user = this.getAuthenticatedUser(req);
    if (user.role !== 'administrator') {
      throw new Error('Administrator access required');
    }
    return user;
  }
}
