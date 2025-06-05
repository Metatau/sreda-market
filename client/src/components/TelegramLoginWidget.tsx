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

    // Создаем уникальную функцию для обработки аутентификации
    const callbackName = `telegramCallback_${Math.random().toString(36).substr(2, 9)}`;
    
    // Создаем глобальную функцию для обработки результата
    (window as any)[callbackName] = (user: any) => {
      handleTelegramAuth(user);
      // Удаляем глобальную функцию после использования
      delete (window as any)[callbackName];
    };

    // Создаем скрипт для Telegram Login Widget
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', username);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-onauth', callbackName);
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-userpic', usePic.toString());

    // Очищаем контейнер и добавляем скрипт
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);
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