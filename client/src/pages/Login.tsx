import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, User, Mail, UserPlus, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { TelegramLoginWidget } from '@/components/TelegramLoginWidget';

export default function Login() {
  const { login } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Форма входа
  const [loginForm, setLoginForm] = useState({
    email: '',
  });

  // Форма регистрации
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    telegramHandle: '',
    referralCode: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(loginForm.email);
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать в SREDA Market",
      });
    } catch (error) {
      toast({
        title: "Ошибка входа",
        description: "Пользователь не найден или произошла ошибка",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    try {
      await login('saabox@yandex.ru');
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать, Администратор",
      });
    } catch (error) {
      toast({
        title: "Ошибка входа",
        description: "Не удалось войти как администратор",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest('POST', '/api/users/register', registerForm);
      
      // После регистрации автоматически входим
      await login(registerForm.email);
      
      toast({
        title: "Регистрация успешна",
        description: "Добро пожаловать в SREDA Market",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Произошла ошибка при регистрации",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsAdmin = async () => {
    setIsLoading(true);
    try {
      await login('saabox@yandex.ru');
      toast({
        title: "Администратор",
        description: "Вход выполнен с правами администратора",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось войти как администратор",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramAuth = async (telegramUser: any) => {
    setIsLoading(true);
    try {
      // Используем email из Telegram данных или создаем временный
      const email = telegramUser.email || `${telegramUser.id}@telegram.local`;
      await login(email);
      
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать в SREDA Market",
      });
    } catch (error) {
      toast({
        title: "Ошибка входа",
        description: "Не удалось войти через Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SREDA Market</h1>
          <p className="text-gray-600">Smart Real Estate</p>
        </div>

        {/* Кнопка входа администратора */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <Button
              onClick={handleAdminLogin}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              <Shield className="mr-2 h-5 w-5" />
              Вход как Администратор
            </Button>
            <p className="text-xs text-orange-700 text-center mt-2">
              Только для saabox@yandex.ru
            </p>
          </CardContent>
        </Card>

        {/* Telegram Login */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Быстрый вход через Telegram</h3>
              <p className="text-sm text-blue-700">Безопасно и удобно</p>
            </div>
            <TelegramLoginWidget 
              onAuth={handleTelegramAuth}
              className="mb-2"
            />
          </CardContent>
        </Card>

        {/* Разделитель */}
        <div className="flex items-center justify-center">
          <div className="border-t border-gray-300 w-full"></div>
          <span className="px-4 text-gray-500 text-sm">или</span>
          <div className="border-t border-gray-300 w-full"></div>
        </div>

        {/* Табы для клиентов */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Клиентский доступ
            </CardTitle>
            <CardDescription>
              Войдите в систему или зарегистрируйтесь как клиент
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    <Mail className="mr-2 h-4 w-4" />
                    Войти
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Имя</Label>
                      <Input
                        id="firstName"
                        placeholder="Иван"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Фамилия</Label>
                      <Input
                        id="lastName"
                        placeholder="Иванов"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Имя пользователя</Label>
                    <Input
                      id="username"
                      placeholder="ivan_ivanov"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telegram">Telegram (необязательно)</Label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="telegram"
                        placeholder="@username"
                        className="pl-10"
                        value={registerForm.telegramHandle}
                        onChange={(e) => setRegisterForm({ ...registerForm, telegramHandle: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referralCode">Промокод (необязательно)</Label>
                    <Input
                      id="referralCode"
                      placeholder="Введите промокод"
                      value={registerForm.referralCode}
                      onChange={(e) => setRegisterForm({ ...registerForm, referralCode: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Зарегистрироваться
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Информация о тарифах */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Тарифные планы:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• <strong>Промо:</strong> 1 AI-запрос в день</div>
              <div>• <strong>Стандарт:</strong> 10 AI-запросов в день</div>
              <div>• <strong>Профи:</strong> 30 AI-запросов в день</div>
              <div>• <strong>Администратор:</strong> Безлимитный доступ</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}