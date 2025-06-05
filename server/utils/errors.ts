/**
 * Centralized error handling system
 */
import { Request, Response, NextFunction } from "express";

export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;

  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;

  constructor(message: string = "Validation failed", cause?: Error) {
    super(message, cause);
  }
}

export class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;

  constructor(resource: string = "Resource", cause?: Error) {
    super(`${resource} not found`, cause);
  }
}

export class DatabaseError extends AppError {
  statusCode = 500;
  isOperational = true;

  constructor(message: string = "Database operation failed", cause?: Error) {
    super(message, cause);
  }
}

export class ExternalServiceError extends AppError {
  statusCode = 503;
  isOperational = true;

  constructor(service: string, message?: string, cause?: Error) {
    super(message || `External service ${service} is unavailable`, cause);
  }
}

/**
 * Async error handler wrapper
 */
export function handleAsyncError(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        type: err.constructor.name,
        ...(process.env.NODE_ENV === 'development' && {
          stack: err.stack,
          cause: err.cause?.message
        })
      }
    });
  }

  // Unexpected errors
  console.error('Unexpected error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal Server Error',
      type: 'UnexpectedError',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}