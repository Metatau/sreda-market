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

    // Проверяем, если это домен sreda.market или верифицированный Replit домен - используем полноценный виджет
    // Для других доменов показываем информационную кнопку
    const isVerifiedDomain = window.location.hostname.includes('sreda.market') || 
                           window.location.hostname.includes('1c0c01a7-b1a3-42ab-a683-a045f1cc20d8-00-38e3l2t1r201x.kirk.replit.dev');
    
    if (!isVerifiedDomain) {
      containerRef.current.innerHTML = `
        <button 
          onclick="alert('Telegram вход настроен для домена sreda.market.\\n\\nТекущий домен: ${window.location.hostname}\\n\\nДля полной функциональности используйте основной домен.')"
          class="bg-[#0088cc] hover:bg-[#006699] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 w-full"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.375 2.655-1.396 3.118-2.286 3.251-.446.066-.8.12-1.061.12-.502 0-.888-.192-1.177-.387-.2-.136-.357-.27-.467-.344l-3.35-2.671-.01-.01c-.436-.346-.618-.859-.618-1.379 0-.52.182-1.033.618-1.379l3.35-2.671c.11-.074.267-.208.467-.344.289-.195.675-.387 1.177-.387.261 0 .615.054 1.061.12.89.133 1.911.596 2.286 3.251 0 0 .727 4.87.896 6.728z"/>
          </svg>
          Войти через Telegram
        </button>
      `;
      return;
    }

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