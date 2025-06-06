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

    console.log('Initializing Telegram widget with username:', username);
    console.log('Current domain:', window.location.hostname);

    // Проверяем верифицированные домены
    const currentDomain = window.location.hostname;
    const isVerifiedDomain = currentDomain.includes('sreda.market') || 
                           currentDomain.includes('replit.dev') ||
                           currentDomain.includes('replit.app') ||
                           currentDomain.includes('kirk.replit.dev');
    
    console.log('Is verified domain:', isVerifiedDomain);

    if (!isVerifiedDomain) {
      console.log('Domain not verified, creating custom auth button');
      containerRef.current.innerHTML = `
        <button 
          id="telegram-custom-auth"
          class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-white">
            <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.375 2.655-1.396 3.118-2.286 3.251-.446.066-.8.12-1.061.12-.502 0-.888-.192-1.177-.387-.2-.136-.357-.27-.467-.344l-3.35-2.671-.01-.01c-.436-.346-.618-.859-.618-1.379 0-.52.182-1.033.618-1.379l3.35-2.671c.11-.074.267-.208.467-.344.289-.195.675-.387 1.177-.387.261 0 .615.054 1.061.12.89.133 1.911.596 2.286 3.251 0 0 .727 4.87.896 6.728z"/>
          </svg>
          <span>Войти через Telegram</span>
        </button>
      `;
      
      // Добавляем обработчик клика
      const customButton = containerRef.current.querySelector('#telegram-custom-auth');
      if (customButton) {
        customButton.addEventListener('click', () => {
          const authUrl = `https://t.me/${username}?start=auth_${Math.random().toString(36).substr(2, 9)}`;
          window.open(authUrl, '_blank', 'width=400,height=500');
        });
      }
      return;
    }

    console.log('Domain verified, creating Telegram widget');

    // Очищаем контейнер
    containerRef.current.innerHTML = '';

    // Создаем скрипт для Telegram Login Widget
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', username);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-auth-url', `${window.location.origin}/api/auth/telegram`);
    script.setAttribute('data-request-access', requestAccess);

    console.log('Widget attributes set:', {
      login: username,
      size: buttonSize,
      radius: cornerRadius,
      authUrl: `${window.location.origin}/api/auth/telegram`
    });

    // Добавляем скрипт в контейнер
    containerRef.current.appendChild(script);

    // Добавляем обработчик успешной загрузки
    script.onload = () => {
      console.log('Telegram widget script loaded successfully');
    };

    // Добавляем обработчик ошибок загрузки
    script.onerror = (error) => {
      console.error('Failed to load Telegram widget script:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p class="text-sm text-red-600">Ошибка загрузки Telegram виджета</p>
            <p class="text-xs text-red-500 mt-1">Проверьте подключение к интернету</p>
          </div>
        `;
      }
    };

    // Добавляем таймаут для проверки загрузки виджета
    setTimeout(() => {
      if (containerRef.current && containerRef.current.children.length === 1) {
        console.log('Widget may not have loaded properly, checking...');
        const iframe = containerRef.current.querySelector('iframe');
        if (!iframe) {
          console.warn('No iframe found in widget container');
          containerRef.current.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p class="text-sm text-yellow-700">Telegram виджет загружается...</p>
              <p class="text-xs text-yellow-600 mt-1">Если кнопка не появилась, проверьте настройки домена в @BotFather</p>
            </div>
          `;
        } else {
          console.log('Telegram widget iframe found successfully');
        }
      }
    }, 3000);
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