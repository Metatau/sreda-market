// Яндекс.Метрика интеграция для SREDA Market
declare global {
  interface Window {
    ym: (id: number, method: string, ...params: any[]) => void;
    yandex_metrika_callbacks: (() => void)[];
  }
}

export interface YandexMetrikaConfig {
  id: number;
  clickmap: boolean;
  trackLinks: boolean;
  accurateTrackBounce: boolean;
  webvisor: boolean;
  trackHash: boolean;
}

export const defaultMetrikaConfig: YandexMetrikaConfig = {
  id: 102457028, // ID из HTML-кода
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true,
  trackHash: true
};

/**
 * Инициализация Яндекс.Метрики
 */
export function initYandexMetrika(config: Partial<YandexMetrikaConfig> = {}): void {
  const finalConfig = { ...defaultMetrikaConfig, ...config };

  // Проверяем, что Метрика еще не инициализирована
  if (typeof window.ym === 'function') {
    console.log('Yandex Metrika already initialized');
    return;
  }

  // Инициализируем массив callbacks
  window.yandex_metrika_callbacks = window.yandex_metrika_callbacks || [];

  // Функция инициализации
  const initMetrika = () => {
    try {
      if (!window.ym) {
        window.ym = function (id: number, method: string, ...params: any[]) {
          (window.ym as any).a = (window.ym as any).a || [];
          (window.ym as any).a.push([id, method, ...params]);
        };
        (window.ym as any).l = +new Date();
      }

      // Инициализация счетчика
      window.ym(finalConfig.id, 'init', {
        clickmap: finalConfig.clickmap,
        trackLinks: finalConfig.trackLinks,
        accurateTrackBounce: finalConfig.accurateTrackBounce,
        webvisor: finalConfig.webvisor,
        trackHash: finalConfig.trackHash
      });

      console.log('Yandex Metrika initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Yandex Metrika:', error);
    }
  };

  // Добавляем в callbacks
  window.yandex_metrika_callbacks.push(initMetrika);

  // Загружаем скрипт если еще не загружен
  if (!document.querySelector('script[src*="mc.yandex.ru"]')) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/watch.js';
    
    script.onload = () => {
      // Выполняем все callbacks
      window.yandex_metrika_callbacks.forEach(callback => callback());
      window.yandex_metrika_callbacks = [];
    };

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);
  } else {
    // Скрипт уже загружен, выполняем инициализацию
    initMetrika();
  }
}

/**
 * Отслеживание события взаимодействия с картой
 */
export function trackMapEvent(action: string, params: Record<string, any> = {}): void {
  if (!window.ym) {
    console.warn('Yandex Metrika not initialized');
    return;
  }

  try {
    window.ym(defaultMetrikaConfig.id, 'reachGoal', `map_${action}`, params);
    console.log(`Tracked map event: ${action}`, params);
  } catch (error) {
    console.error('Failed to track map event:', error);
  }
}

/**
 * Отслеживание клика по объекту недвижимости
 */
export function trackPropertyClick(propertyId: number, propertyData: any = {}): void {
  trackMapEvent('property_click', {
    property_id: propertyId,
    property_type: propertyData.propertyType,
    price: propertyData.price,
    region: propertyData.region?.name,
    rooms: propertyData.rooms
  });
}

/**
 * Отслеживание поиска недвижимости
 */
export function trackPropertySearch(searchParams: any): void {
  trackMapEvent('property_search', {
    region_id: searchParams.regionId,
    property_class_id: searchParams.propertyClassId,
    min_price: searchParams.minPrice,
    max_price: searchParams.maxPrice,
    rooms: searchParams.rooms,
    search_type: searchParams.marketType
  });
}

/**
 * Отслеживание использования фильтров
 */
export function trackFilterUsage(filterType: string, filterValue: any): void {
  trackMapEvent('filter_usage', {
    filter_type: filterType,
    filter_value: filterValue
  });
}

/**
 * Отслеживание изменения режима тепловой карты
 */
export function trackHeatmapMode(mode: string): void {
  trackMapEvent('heatmap_mode_change', {
    mode: mode
  });
}

/**
 * Отслеживание рисования областей на карте
 */
export function trackAreaDrawing(area: { area: number; type: string }): void {
  trackMapEvent('area_drawing', {
    area_km2: (area.area / 1000000).toFixed(2),
    drawing_type: area.type
  });
}

/**
 * Отслеживание использования поиска адресов
 */
export function trackAddressSearch(query: string, found: boolean): void {
  trackMapEvent('address_search', {
    query_length: query.length,
    found: found,
    search_type: 'geocoding'
  });
}

/**
 * Отслеживание AI-запросов
 */
export function trackAIUsage(actionType: string, success: boolean): void {
  trackMapEvent('ai_usage', {
    action_type: actionType,
    success: success
  });
}

/**
 * Отслеживание просмотра аналитики объекта
 */
export function trackPropertyAnalytics(propertyId: number, analyticsType: string): void {
  trackMapEvent('property_analytics_view', {
    property_id: propertyId,
    analytics_type: analyticsType
  });
}

/**
 * Отслеживание экспорта данных
 */
export function trackDataExport(exportType: string, recordCount: number): void {
  trackMapEvent('data_export', {
    export_type: exportType,
    record_count: recordCount
  });
}

/**
 * Отслеживание авторизации пользователя
 */
export function trackUserAuth(method: string, success: boolean): void {
  if (!window.ym) return;

  try {
    window.ym(defaultMetrikaConfig.id, 'reachGoal', 'user_auth', {
      auth_method: method,
      success: success
    });
  } catch (error) {
    console.error('Failed to track user auth:', error);
  }
}

/**
 * Отслеживание ошибок приложения
 */
export function trackError(errorType: string, errorMessage: string, context?: string): void {
  trackMapEvent('app_error', {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Ограничиваем длину
    context: context
  });
}

/**
 * Отслеживание производительности
 */
export function trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
  trackMapEvent('performance_metric', {
    metric: metric,
    value: value,
    unit: unit
  });
}

/**
 * Пользовательские события для бизнес-метрик
 */
export const businessMetrics = {
  /**
   * Конверсия: просмотр объекта → запрос информации
   */
  trackPropertyInquiry: (propertyId: number) => {
    if (window.ym) {
      window.ym(defaultMetrikaConfig.id, 'reachGoal', 'property_inquiry', { property_id: propertyId });
    }
  },

  /**
   * Использование платных функций
   */
  trackPremiumFeatureUsage: (featureName: string) => {
    if (window.ym) {
      window.ym(defaultMetrikaConfig.id, 'reachGoal', 'premium_feature_usage', { feature: featureName });
    }
  },

  /**
   * Завершение регистрации
   */
  trackRegistrationComplete: (method: string) => {
    if (window.ym) {
      window.ym(defaultMetrikaConfig.id, 'reachGoal', 'registration_complete', { method });
    }
  },

  /**
   * Подписка на уведомления
   */
  trackNotificationSubscription: (type: string) => {
    if (window.ym) {
      window.ym(defaultMetrikaConfig.id, 'reachGoal', 'notification_subscription', { type });
    }
  }
};