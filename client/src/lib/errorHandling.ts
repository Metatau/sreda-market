// Централизованная обработка ошибок без внешних зависимостей
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isInitialized = false;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    // Глобальная обработка JavaScript ошибок
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: 'javascript_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Глобальная обработка unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault(); // Предотвращаем вывод в консоль
      
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      this.handleError(error, {
        type: 'unhandled_promise_rejection'
      });
    });

    this.isInitialized = true;
    console.log('Global error handling initialized');
  }

  public handleError(error: Error, context: Record<string, any> = {}): void {
    // Фильтруем известные безопасные ошибки
    if (this.isSafeError(error)) {
      return;
    }

    // Логируем ошибку в development режиме
    if (import.meta.env.DEV) {
      console.warn('Handled error:', {
        message: error.message,
        stack: error.stack,
        context
      });
    }

    // В production можно отправлять в аналитику
    if (import.meta.env.PROD) {
      try {
        // Отправляем в Яндекс.Метрику если доступна
        if (window.ym) {
          window.ym(102457028, 'reachGoal', 'error', {
            error_message: error.message,
            error_type: context.type || 'unknown'
          });
        }
      } catch (trackingError) {
        // Игнорируем ошибки отслеживания
      }
    }
  }

  private isSafeError(error: Error): boolean {
    const safePatterns = [
      /Network error/i,
      /Failed to fetch/i,
      /Failed fetch, not 2xx response/i,
      /Load failed/i,
      /Mapbox/i,
      /tileset/i,
      /access.*token/i,
      /304/i, // Cached responses
      /401/i, // Unauthorized (expected)
      /404/i  // Not found (expected in some cases)
    ];

    return safePatterns.some(pattern => 
      pattern.test(error.message) || 
      pattern.test(error.stack || '')
    );
  }
}

// Утилита для безопасного выполнения Promise
export async function safePromise<T>(
  promise: Promise<T>,
  defaultValue?: T
): Promise<T | undefined> {
  try {
    return await promise;
  } catch (error) {
    // Обрабатываем ошибку безопасно
    GlobalErrorHandler.getInstance().handleError(
      error instanceof Error ? error : new Error(String(error)),
      { type: 'safe_promise_catch' }
    );
    return defaultValue;
  }
}

// Инициализация глобальной обработки ошибок
export function setupGlobalErrorHandling(): void {
  GlobalErrorHandler.getInstance().initialize();
}