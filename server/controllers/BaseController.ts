
import { Request, Response } from "express";
import { AppError, ValidationError } from "../utils/errors";

export abstract class BaseController {
  protected sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      data,
    });
  }

  protected sendError(res: Response, error: AppError): void {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }

  protected validateId(id: string): number {
    const numId = parseInt(id, 10);
    if (isNaN(numId) || numId <= 0) {
      throw new ValidationError("Invalid ID provided");
    }
    return numId;
  }

  protected validatePagination(page?: string, perPage?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const perPageNum = perPage ? parseInt(perPage, 10) : 20;
    
    if (pageNum < 1) throw new ValidationError("Page must be greater than 0");
    if (perPageNum < 1 || perPageNum > 100) throw new ValidationError("Per page must be between 1 and 100");
    
    return { page: pageNum, perPage: perPageNum };
  }
}
