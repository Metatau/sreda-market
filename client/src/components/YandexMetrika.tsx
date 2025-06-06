import { useEffect } from 'react';
import { useLocation } from 'wouter';

declare global {
  interface Window {
    ym: (counterId: number, method: string, ...args: any[]) => void;
  }
}

export function YandexMetrika() {
  const [location] = useLocation();

  useEffect(() => {
    // Отправляем данные о просмотре страницы при изменении маршрута
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(102457028, 'hit', window.location.href);
    }
  }, [location]);

  return null;
}

// Утилитарные функции для отправки событий
export const metrika = {
  // Отправка цели
  reachGoal: (target: string, params?: any) => {
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(102457028, 'reachGoal', target, params);
    }
  },

  // Отправка параметров пользователя
  setUserParams: (params: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(102457028, 'userParams', params);
    }
  },

  // Отправка произвольного события
  hit: (url?: string) => {
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(102457028, 'hit', url || window.location.href);
    }
  }
};