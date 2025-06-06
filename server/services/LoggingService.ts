/**
 * Centralized logging service to replace scattered console.log statements
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogContext {
  userId?: number;
  requestId?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

export class LoggingService {
  private static currentLevel: LogLevel = LogLevel.INFO;

  static setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  static error(message: string, context?: LogContext, error?: Error) {
    if (this.currentLevel >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, context));
      if (error) {
        console.error(error.stack);
      }
    }
  }

  static warn(message: string, context?: LogContext) {
    if (this.currentLevel >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  static info(message: string, context?: LogContext) {
    if (this.currentLevel >= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  static debug(message: string, context?: LogContext) {
    if (this.currentLevel >= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  static apiRequest(method: string, path: string, statusCode: number, duration: number, userId?: number) {
    const context: LogContext = {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      userId
    };
    
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    const message = `${method} ${path} ${statusCode} in ${duration}ms`;
    
    if (level === 'ERROR') {
      this.error(message, context);
    } else if (level === 'WARN') {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  static performance(action: string, duration: number, context?: LogContext) {
    this.info(`Performance: ${action} completed in ${duration}ms`, {
      ...context,
      action,
      duration
    });
  }

  static security(event: string, context?: LogContext) {
    this.warn(`Security: ${event}`, {
      ...context,
      securityEvent: event,
      timestamp: new Date().toISOString()
    });
  }

  private static formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` :: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }
}

// Initialize logging level based on environment
if (process.env.NODE_ENV === 'development') {
  LoggingService.setLevel(LogLevel.DEBUG);
} else if (process.env.NODE_ENV === 'production') {
  LoggingService.setLevel(LogLevel.INFO);
}