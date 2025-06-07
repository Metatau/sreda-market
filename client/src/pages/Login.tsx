import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, UserPlus, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { TelegramAuthButton } from '@/components/TelegramAuthButton';

export default function Login() {
  const { login } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Форма входа
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Форма регистрации
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    telegramHandle: '',
    referralCode: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/login', loginForm);
      const response = await res.json();

      if (response.success) {
        // Store user email for session management
        localStorage.setItem('userEmail', response.user.email);
        
        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в SREDA Market",
        });
        // Redirect to main page after successful login
        window.location.href = '/';
      } else {
        toast({
          title: "Ошибка входа",
          description: response.error || "Неверный email или пароль",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка входа",
        description: "Произошла ошибка при входе в систему",
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
      const res = await apiRequest('POST', '/api/auth/register', registerForm);
      const response = await res.json();

      if (response.success) {
        // Store user email for session management
        localStorage.setItem('userEmail', response.user.email);
        
        toast({
          title: "Регистрация успешна",
          description: "Добро пожаловать в SREDA Market",
        });
        
        // Redirect to main page after successful registration
        window.location.href = '/';
      } else {
        toast({
          title: "Ошибка регистрации",
          description: response.error || "Произошла ошибка при регистрации",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: "Произошла ошибка при регистрации",
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
      
      // Redirect to main page after successful login
      window.location.href = '/';
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
          <h1 className="text-3xl font-quantum font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 mb-2 tracking-widest uppercase">SREDA Market</h1>
          <p className="text-gray-600">Smart Real Estate</p>
        </div>





        {/* Табы для клиентов */}
        <Card>
          <CardHeader>
            <CardDescription className="text-center">Войдите в систему или зарегистрируйтесь</CardDescription>
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
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Введите пароль"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                    <Label htmlFor="register-password">Пароль</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Минимум 6 символов"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
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

        
      </div>
    </div>
  );
}