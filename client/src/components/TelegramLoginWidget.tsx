import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TelegramLoginWidgetProps {
  onAuth: (user: any) => void;
  botUsername?: string;
  buttonSize?: 'small' | 'medium' | 'large';
  cornerRadius?: number;
  requestAccess?: 'write';
  usePic?: boolean;
  className?: string;
}

export const TelegramLoginWidget = ({ 
  onAuth, 
  botUsername,
  buttonSize = 'large',
  cornerRadius = 10,
  requestAccess = 'write',
  usePic = true,
  className = ''
}: TelegramLoginWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!botUsername) {
      // Получаем конфигурацию бота с сервера
      fetch('/api/auth/telegram/config')
        .then(res => res.json())
        .then(config => {
          if (config.error) {
            toast({
              title: "Telegram не настроен",
              description: "Для входа через Telegram требуется настройка бота",
              variant: "destructive",
            });
            return;
          }
          initializeTelegramWidget(config.botUsername);
        })
        .catch(error => {
          console.error('Failed to get Telegram config:', error);
          toast({
            title: "Ошибка настройки",
            description: "Не удалось получить настройки Telegram",
            variant: "destructive",
          });
        });
    } else {
      initializeTelegramWidget(botUsername);
    }
  }, [botUsername]);

  const initializeTelegramWidget = (username: string) => {
    if (!containerRef.current) return;

    // Проверяем верифицированные домены
    const isVerifiedDomain = window.location.hostname.includes('sreda.market') || 
                           window.location.hostname.includes('1c0c01a7-b1a3-42ab-a683-a045f1cc20d8-00-38e3l2t1r201x.kirk.replit.dev');
    
    if (!isVerifiedDomain) {
      containerRef.current.innerHTML = `
        <div class="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-600 mb-2">Telegram вход доступен только на верифицированных доменах</p>
          <p class="text-xs text-gray-500">Текущий домен: ${window.location.hostname}</p>
        </div>
      `;
      return;
    }

    // Очищаем контейнер
    containerRef.current.innerHTML = '';

    // Создаем div для виджета
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'telegram-login-' + username;
    
    // Создаем скрипт для Telegram Login Widget
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', username);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram`);
    script.setAttribute('data-request-access', requestAccess);

    // Добавляем элементы в контейнер
    containerRef.current.appendChild(widgetContainer);
    containerRef.current.appendChild(script);

    // Добавляем обработчик ошибок загрузки
    script.onerror = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p class="text-sm text-red-600">Ошибка загрузки Telegram виджета</p>
            <p class="text-xs text-red-500 mt-1">Проверьте подключение к интернету</p>
          </div>
        `;
      }
    };
  };

  const handleTelegramAuth = async (user: any) => {
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в SREDA Market",
        });
        onAuth(result.user);
      } else {
        toast({
          title: "Ошибка входа",
          description: result.error || "Не удалось войти через Telegram",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Telegram auth error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при входе через Telegram",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={className}>
      <div ref={containerRef} className="flex justify-center">
        <div className="flex items-center justify-center min-h-[40px] text-sm text-gray-500">
          Загрузка Telegram виджета...
        </div>
      </div>
    </div>
  );
};