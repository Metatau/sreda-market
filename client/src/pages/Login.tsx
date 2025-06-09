import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, UserPlus, MessageCircle, TrendingUp } from 'lucide-react';
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

  // Состояние чекбокса согласия
  const [agreementChecked, setAgreementChecked] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest('/api/users/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });

      if (response.success) {
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
    
    // Проверяем согласие с правовой информацией
    if (!agreementChecked) {
      toast({
        title: "Требуется согласие",
        description: "Необходимо принять соглашение для продолжения регистрации",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('/api/users/register', {
        method: 'POST',
        body: JSON.stringify(registerForm),
      });

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md space-y-4 sm:space-y-6">
        {/* Заголовок */}
        <div className="text-center px-2">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-quantum font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SREDA Market</h1>
          </div>
          <p className="text-gray-600 text-xs sm:text-[14px] text-center">Smart Real Estate Data Analytics</p>
        </div>





        {/* Табы для клиентов */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardDescription className="text-center text-xs sm:text-sm">Войдите в систему или зарегистрируйтесь</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
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

                  {/* Согласие с правовой информацией */}
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreement"
                        checked={agreementChecked}
                        onCheckedChange={(checked) => setAgreementChecked(checked as boolean)}
                        className="mt-1"
                      />
                      <div className="text-sm text-gray-600 leading-relaxed">
                        <Label htmlFor="agreement" className="text-sm text-gray-700 cursor-pointer">
                          Я ознакомлен и согласен с{' '}
                        </Label>
                        <a 
                          href="/polzovatelskoe-soglashenie" 
                          target="_blank" 
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          пользовательским соглашением
                        </a>
                        ,{' '}
                        <a 
                          href="/publichnaya-oferta" 
                          target="_blank" 
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          публичной офертой
                        </a>
                        ,{' '}
                        <a 
                          href="/politika-konfidencialnosti" 
                          target="_blank" 
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          политикой конфиденциальности
                        </a>
                        {' '}и даю{' '}
                        <a 
                          href="/soglasie-na-obrabotku-personalnyh-dannyh" 
                          target="_blank" 
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          согласие на обработку персональных данных
                        </a>
                        .
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading || !agreementChecked}>
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