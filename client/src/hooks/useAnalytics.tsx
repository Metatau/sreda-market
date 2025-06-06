import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackMapEvent } from '@/lib/yandexMetrika';

/**
 * Hook для автоматического отслеживания переходов между страницами
 */
export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  
  useEffect(() => {
    // Отслеживаем смену маршрута только если локация действительно изменилась
    if (location !== prevLocationRef.current) {
      trackMapEvent('page_view', { 
        page: location,
        previous_page: prevLocationRef.current 
      });
      
      prevLocationRef.current = location;
      
      // Устанавливаем заголовок страницы для лучшей аналитики
      const pageTitle = getPageTitle(location);
      if (pageTitle && document.title !== pageTitle) {
        document.title = pageTitle;
      }
    }
  }, [location]);
};

/**
 * Получение заголовка страницы на основе маршрута
 */
function getPageTitle(path: string): string {
  const titles: Record<string, string> = {
    '/': 'SREDA Market - Главная',
    '/properties': 'Объекты недвижимости - SREDA Market',
    '/analytics': 'Аналитика недвижимости - SREDA Market',
    '/profile': 'Профиль пользователя - SREDA Market',
    '/admin': 'Панель администратора - SREDA Market'
  };

  return titles[path] || `SREDA Market${path}`;
}

/**
 * Hook для отслеживания пользовательских действий
 */
export const useUserActions = () => {
  return {
    trackButtonClick: (buttonName: string, context?: string) => {
      trackMapEvent('button_click', { 
        button_name: buttonName,
        context: context 
      });
    },

    trackFormSubmit: (formName: string, success: boolean) => {
      trackMapEvent('form_submit', { 
        form_name: formName,
        success: success 
      });
    },

    trackDownload: (fileName: string, fileType: string) => {
      trackMapEvent('file_download', { 
        file_name: fileName,
        file_type: fileType 
      });
    },

    trackSearch: (searchTerm: string, resultCount: number) => {
      trackMapEvent('search', { 
        search_term: searchTerm.substring(0, 50), // Ограничиваем длину
        result_count: resultCount 
      });
    },

    trackError: (errorType: string, errorMessage: string) => {
      trackMapEvent('user_error', { 
        error_type: errorType,
        error_message: errorMessage.substring(0, 100) 
      });
    }
  };
};

/**
 * Hook для отслеживания времени на странице
 */
export const usePageTiming = () => {
  const startTime = useRef<number>(Date.now());
  const [location] = useLocation();

  useEffect(() => {
    // При смене страницы отправляем время, проведенное на предыдущей
    return () => {
      const timeSpent = Date.now() - startTime.current;
      if (timeSpent > 1000) { // Отслеживаем только если больше 1 секунды
        trackMapEvent('page_timing', {
          page: location,
          time_spent_seconds: Math.round(timeSpent / 1000)
        });
      }
    };
  }, [location]);

  useEffect(() => {
    // Обновляем время начала при смене страницы
    startTime.current = Date.now();
  }, [location]);
};