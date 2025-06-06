import { useState, useEffect } from 'react';
import { X, Settings, Shield, BarChart3, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CookieSettings {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
}

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<CookieSettings>({
    necessary: true, // Всегда включены
    analytics: false,
    functional: false
  });

  useEffect(() => {
    // Проверяем, есть ли уже сохраненное согласие
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Показываем баннер через 1 секунду после загрузки страницы
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Применяем сохраненные настройки
      const savedSettings = JSON.parse(consent);
      setSettings(savedSettings);
      applyCookieSettings(savedSettings);
    }
  }, []);

  const applyCookieSettings = (cookieSettings: CookieSettings) => {
    // Управляем загрузкой аналитических скриптов
    if (cookieSettings.analytics) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }

    // Управляем функциональными cookies
    if (cookieSettings.functional) {
      enableFunctionalCookies();
    } else {
      disableFunctionalCookies();
    }
  };

  const enableAnalytics = () => {
    // Яндекс.Метрика уже загружена в HTML, активируем ее
    if (window.ym) {
      window.ym(102457028, 'userParams', { cookieConsent: 'granted' });
    }

    // Google Analytics (если будет добавлен)
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  };

  const disableAnalytics = () => {
    // Отключаем аналитику
    if (window.ym) {
      window.ym(102457028, 'userParams', { cookieConsent: 'denied' });
    }

    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }
  };

  const enableFunctionalCookies = () => {
    // Включаем функциональные cookies
    document.cookie = "preferences=enabled; path=/; max-age=31536000; SameSite=Lax";
  };

  const disableFunctionalCookies = () => {
    // Удаляем функциональные cookies
    document.cookie = "preferences=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  const saveConsent = (cookieSettings: CookieSettings) => {
    localStorage.setItem('cookie-consent', JSON.stringify(cookieSettings));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    applyCookieSettings(cookieSettings);
    setIsVisible(false);
    setShowSettings(false);

    // Отправляем событие в аналитику (если разрешено)
    if (cookieSettings.analytics && window.ym) {
      window.ym(102457028, 'reachGoal', 'cookie_consent_granted');
    }
  };

  const acceptAll = () => {
    const allSettings = {
      necessary: true,
      analytics: true,
      functional: true
    };
    setSettings(allSettings);
    saveConsent(allSettings);
  };

  const rejectAll = () => {
    const minimalSettings = {
      necessary: true,
      analytics: false,
      functional: false
    };
    setSettings(minimalSettings);
    saveConsent(minimalSettings);
  };

  const saveCustomSettings = () => {
    saveConsent(settings);
  };

  const toggleSetting = (key: keyof CookieSettings) => {
    if (key === 'necessary') return; // Нельзя отключить обязательные
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg font-semibold">
                Уведомление об использовании файлов cookie
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={rejectAll}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!showSettings ? (
            <>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  ИП Шинкаренко Андрей Александрович (ОГРНИП 315595800025579, ИНН 590401203802) 
                  использует файлы cookie для обеспечения работы сайта, аналитики и улучшения пользовательского опыта.
                </p>
                <p>
                  Мы используем Яндекс.Метрику для анализа посещаемости. Вы можете управлять настройками 
                  согласия или отказаться от использования аналитических cookies.
                </p>
                <p>
                  Подробная информация о обработке данных в{' '}
                  <a href="/politika-konfidencialnosti/" className="text-blue-600 hover:underline">
                    Политике конфиденциальности
                  </a>
                  {' '}и{' '}
                  <a href="/politika-obrabotki-personalnyh-dannyh/" className="text-blue-600 hover:underline">
                    Политике обработки персональных данных
                  </a>
                  .
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={acceptAll}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Принять все
                </Button>
                <Button 
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Настройки
                </Button>
                <Button 
                  onClick={rejectAll}
                  variant="outline"
                  className="flex-1"
                >
                  Отклонить все
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                <p>Выберите, какие типы файлов cookie вы разрешаете использовать:</p>
              </div>

              <div className="space-y-4">
                {/* Обязательные cookies */}
                <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Checkbox 
                    checked={true} 
                    disabled={true}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">Обязательные cookies</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Всегда активны
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Необходимы для работы сайта: сессии, безопасность, сохранение настроек входа.
                    </p>
                  </div>
                </div>

                {/* Аналитические cookies */}
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox 
                    checked={settings.analytics}
                    onCheckedChange={() => toggleSetting('analytics')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">Аналитические cookies</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Яндекс.Метрика для анализа посещаемости и улучшения сайта. Данные анонимизированы.
                    </p>
                  </div>
                </div>

                {/* Функциональные cookies */}
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox 
                    checked={settings.functional}
                    onCheckedChange={() => toggleSetting('functional')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Wrench className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-sm">Функциональные cookies</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Персонализация контента, сохранение предпочтений интерфейса.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>
                  <strong>Ваши права:</strong> Вы можете изменить согласие в любое время. 
                  Обработка данных осуществляется в соответствии с ФЗ №152 "О персональных данных".
                </p>
                <p>
                  <strong>Контакты:</strong> info@monodigitalstudio.ru, 8 800 101 51 59
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={saveCustomSettings}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Сохранить настройки
                </Button>
                <Button 
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Назад
                </Button>
              </div>
            </>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
            Дата обновления политики: 07 июня 2025 г. | В соответствии с требованиями ФЗ №152 и №420-ФЗ
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Глобальные типы для TypeScript
declare global {
  interface Window {
    ym: (counterId: number, method: string, ...args: any[]) => void;
    gtag: (command: string, ...args: any[]) => void;
  }
}