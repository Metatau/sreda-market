import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TelegramAuthButtonProps {
  onAuth: (user: any) => void;
  className?: string;
}

export const TelegramAuthButton = ({ onAuth, className = '' }: TelegramAuthButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!containerRef.current) return;

    // Очищаем контейнер
    containerRef.current.innerHTML = '';

    // Создаем Telegram Login Widget с правильными параметрами
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'sreda_clients_bot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-auth-url', 'https://sreda.market/');
    script.setAttribute('data-request-access', 'write');

    // Глобальная функция для обработки ответа от Telegram
    (window as any).onTelegramAuth = (user: any) => {
      console.log('Telegram auth data received:', user);
      
      // Отправляем данные на сервер для проверки
      fetch('/api/auth/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('userEmail', data.user.email);
          onAuth(data.user);
          toast({
            title: "Успешная авторизация",
            description: "Добро пожаловать в SREDA Market!",
          });
          window.location.href = '/';
        } else {
          toast({
            title: "Ошибка авторизации",
            description: data.error || "Не удалось войти через Telegram",
            variant: "destructive",
          });
        }
      })
      .catch(error => {
        console.error('Telegram auth error:', error);
        toast({
          title: "Ошибка авторизации",
          description: "Не удалось войти через Telegram",
          variant: "destructive",
        });
      });
    };

    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    containerRef.current.appendChild(script);

    script.onload = () => {
      console.log('Telegram widget script loaded successfully');
    };

    script.onerror = (error) => {
      console.error('Failed to load Telegram widget script:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <button class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-white">
              <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.375 2.655-1.396 3.118-2.286 3.251-.446.066-.8.12-1.061.12-.502 0-.888-.192-1.177-.387-.2-.136-.357-.27-.467-.344l-3.35-2.671-.01-.01c-.436-.346-.618-.859-.618-1.379 0-.52.182-1.033.618-1.379l3.35-2.671c.11-.074.267-.208.467-.344.289-.195.675-.387 1.177-.387.261 0 .615.054 1.061.12.89.133 1.911.596 2.286 3.251 0 0 .727 4.87.896 6.728z"/>
            </svg>
            <span>Telegram недоступен</span>
          </button>
        `;
      }
    };

    return () => {
      // Очистка при размонтировании
      if ((window as any).onTelegramAuth) {
        delete (window as any).onTelegramAuth;
      }
    };
  }, [onAuth, toast]);

  return (
    <div ref={containerRef} className={className}>
      {/* Telegram widget будет загружен сюда */}
    </div>
  );
};