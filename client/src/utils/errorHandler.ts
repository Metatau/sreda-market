// Централизованная обработка ошибок
import { trackError } from '@/lib/yandexMetrika';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: number;
  additional?: Record<string, any>;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: Array<{ error: Error; context: ErrorContext; timestamp: number }> = [];
  private maxQueueSize = 50;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Обработка ошибки с контекстом
   */
  handleError(error: Error, context: ErrorContext = {}): void {
    const errorInfo = {
      error,
      context,
      timestamp: Date.now()
    };

    // Добавляем в очередь
    this.errorQueue.push(errorInfo);
    
    // Ограничиваем размер очереди
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Логируем в консоль для разработки
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      context
    });

    // Отправляем в аналитику
    try {
      trackError(
        context.component || 'unknown',
        error.message,
        context.action
      );
    } catch (trackingError) {
      console.warn('Failed to track error:', trackingError);
    }

    // Уведомляем пользователя при критических ошибках
    if (this.isCriticalError(error, context)) {
      this.notifyUser(error, context);
    }
  }

  /**
   * Определение критичности ошибки
   */
  private isCriticalError(error: Error, context: ErrorContext): boolean {
    const criticalPatterns = [
      /network/i,
      /auth/i,
      /payment/i,
      /database/i,
      /api.*failed/i
    ];

    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(context.component || '')
    );
  }

  /**
   * Уведомление пользователя об ошибке
   */
  private notifyUser(error: Error, context: ErrorContext): void {
    // В реальном приложении здесь может быть toast или modal
    console.warn('User notification:', {
      title: 'Произошла ошибка',
      message: this.getUserFriendlyMessage(error, context)
    });
  }

  /**
   * Получение понятного пользователю сообщения
   */
  private getUserFriendlyMessage(error: Error, context: ErrorContext): string {
    const messageMap: Record<string, string> = {
      'Network Error': 'Проблемы с подключением к интернету',
      'Unauthorized': 'Необходимо войти в систему',
      'Forbidden': 'Недостаточно прав доступа',
      'Not Found': 'Запрашиваемый ресурс не найден',
      'Internal Server Error': 'Временные проблемы на сервере'
    };

    // Поиск подходящего сообщения
    for (const [pattern, message] of Object.entries(messageMap)) {
      if (error.message.includes(pattern)) {
        return message;
      }
    }

    // Сообщение по умолчанию
    return 'Произошла неожиданная ошибка. Попробуйте обновить страницу.';
  }

  /**
   * Получение статистики ошибок
   */
  getErrorStats(): {
    total: number;
    byComponent: Record<string, number>;
    recent: Array<{ error: string; context: string; timestamp: number }>;
  } {
    const byComponent: Record<string, number> = {};
    
    this.errorQueue.forEach(({ context }) => {
      const component = context.component || 'unknown';
      byComponent[component] = (byComponent[component] || 0) + 1;
    });

    const recent = this.errorQueue
      .slice(-10)
      .map(({ error, context, timestamp }) => ({
        error: error.message,
        context: context.component || 'unknown',
        timestamp
      }));

    return {
      total: this.errorQueue.length,
      byComponent,
      recent
    };
  }

  /**
   * Очистка очереди ошибок
   */
  clearErrors(): void {
    this.errorQueue = [];
  }
}

/**
 * Глобальный обработчик необработанных ошибок
 */
export function setupGlobalErrorHandling(): void {
  const errorHandler = ErrorHandler.getInstance();

  // Обработка JavaScript ошибок
  window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error || new Error(event.message), {
      component: 'global',
      action: 'javascript_error',
      additional: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });

  // Обработка Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    errorHandler.handleError(error, {
      component: 'global',
      action: 'unhandled_promise_rejection'
    });
  });

  console.log('Global error handling initialized');
}

/**
 * Утилита для безопасного выполнения асинхронных функций
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    ErrorHandler.getInstance().handleError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    return null;
  }
}

/**
 * Утилита для безопасного выполнения синхронных функций
 */
export function safeSync<T>(
  fn: () => T,
  context: ErrorContext = {}
): T | null {
  try {
    return fn();
  } catch (error) {
    ErrorHandler.getInstance().handleError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    return null;
  }
}

// Экспорт singleton instance
export const errorHandler = ErrorHandler.getInstance();