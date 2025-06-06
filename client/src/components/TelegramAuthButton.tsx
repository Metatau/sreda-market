import { useToast } from '@/hooks/use-toast';

interface TelegramAuthButtonProps {
  onAuth: (user: any) => void;
  className?: string;
}

export const TelegramAuthButton = ({ onAuth, className = '' }: TelegramAuthButtonProps) => {
  const { toast } = useToast();

  const handleTelegramAuth = () => {
    // Для демонстрации создаем простую кнопку, которая показывает инструкции
    toast({
      title: "Telegram авторизация",
      description: "Функция в разработке. Используйте вход по email/паролю.",
    });
  };

  return (
    <button
      onClick={handleTelegramAuth}
      className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-md ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
        <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.375 2.655-1.396 3.118-2.286 3.251-.446.066-.8.12-1.061.12-.502 0-.888-.192-1.177-.387-.2-.136-.357-.27-.467-.344l-3.35-2.671-.01-.01c-.436-.346-.618-.859-.618-1.379 0-.52.182-1.033.618-1.379l3.35-2.671c.11-.074.267-.208.467-.344.289-.195.675-.387 1.177-.387.261 0 .615.054 1.061.12.89.133 1.911.596 2.286 3.251 0 0 .727 4.87.896 6.728z"/>
      </svg>
      <span>Войти через Telegram</span>
    </button>
  );
};