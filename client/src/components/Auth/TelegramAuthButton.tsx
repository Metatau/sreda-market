import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TelegramAuthButtonProps {
  onAuth: (user: any) => void;
  className?: string;
}

export const TelegramAuthButton = ({ onAuth, className = '' }: TelegramAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { toast } = useToast();

  const generateAuthToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleTelegramAuth = async () => {
    setIsLoading(true);
    
    try {
      // Генерируем уникальный токен для авторизации
      const token = generateAuthToken();
      setAuthToken(token);
      
      // Открываем Telegram бота с командой авторизации
      const telegramUrl = `https://t.me/sreda_clients_bot?start=auth_${token}`;
      window.open(telegramUrl, '_blank');
      
      // Начинаем проверку авторизации
      pollForAuth(token);
      
      toast({
        title: "Переход в Telegram",
        description: "Следуйте инструкциям в боте для завершения авторизации",
      });
      
    } catch (error) {
      console.error('Telegram auth error:', error);
      toast({
        title: "Ошибка авторизации",
        description: "Не удалось инициировать авторизацию через Telegram",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const pollForAuth = async (token: string) => {
    const maxAttempts = 60; // 5 минут
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsLoading(false);
        toast({
          title: "Время ожидания истекло",
          description: "Авторизация не была завершена. Попробуйте снова.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await fetch(`/api/auth/telegram/check/${token}`);
        const result = await response.json();

        if (result.success && result.user) {
          setIsLoading(false);
          toast({
            title: "Успешная авторизация",
            description: "Добро пожаловать в SREDA Market!",
          });
          onAuth(result.user);
        } else if (!result.pending) {
          setIsLoading(false);
          toast({
            title: "Ошибка авторизации",
            description: result.error || "Не удалось завершить авторизацию",
            variant: "destructive",
          });
        } else {
          // Продолжаем опрос
          attempts++;
          setTimeout(poll, 5000); // Проверяем каждые 5 секунд
        }
      } catch (error) {
        console.error('Auth polling error:', error);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  return (
    <Button
      onClick={handleTelegramAuth}
      disabled={isLoading}
      className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Ожидание авторизации...</span>
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
            <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.375 2.655-1.396 3.118-2.286 3.251-.446.066-.8.12-1.061.12-.502 0-.888-.192-1.177-.387-.2-.136-.357-.27-.467-.344l-3.35-2.671-.01-.01c-.436-.346-.618-.859-.618-1.379 0-.52.182-1.033.618-1.379l3.35-2.671c.11-.074.267-.208.467-.344.289-.195.675-.387 1.177-.387.261 0 .615.054 1.061.12.89.133 1.911.596 2.286 3.251 0 0 .727 4.87.896 6.728z"/>
          </svg>
          <span>Войти через Telegram</span>
        </>
      )}
    </Button>
  );
};