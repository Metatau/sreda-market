
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const;

export const INVESTMENT_RATINGS = {
  'A+': 'Отличные инвестиционные перспективы',
  'A': 'Хорошие показатели доходности',
  'B+': 'Выше среднего, умеренные риски',
  'B': 'Средние показатели',
  'C+': 'Ниже средних показателей',
  'C': 'Слабые инвестиционные перспективы',
} as const;

export const RISK_LEVELS = {
  low: { name: 'Низкий', color: 'bg-green-100 text-green-800' },
  moderate: { name: 'Умеренный', color: 'bg-yellow-100 text-yellow-800' },
  high: { name: 'Высокий', color: 'bg-red-100 text-red-800' },
} as const;

export const INVESTMENT_STRATEGIES = {
  rental: { name: 'Аренда', icon: 'Home' },
  flip: { name: 'Флиппинг', icon: 'RotateCcw' },
  hold: { name: 'Удержание', icon: 'TrendingUp' },
} as const;

export const DEFAULT_COORDINATES = {
  MOSCOW: [37.6176, 55.7558],
} as const;

export const API_ENDPOINTS = {
  REGIONS: '/regions',
  PROPERTIES: '/properties',
  PROPERTY_CLASSES: '/property-classes',
  CHAT: '/chat',
  ANALYTICS: '/analytics',
} as const;
