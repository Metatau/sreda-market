import { useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { User, Mail, UserPlus, MessageCircle, TrendingUp, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
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

  // Состояние валидации и ошибок
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    general: ''
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
    color: '#ef4444',
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation function
  const validatePassword = useCallback((password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
    const messages = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный'];
    
    let feedback = '';
    const missing = [];
    if (!requirements.length) missing.push('минимум 8 символов');
    if (!requirements.uppercase) missing.push('заглавная буква');
    if (!requirements.lowercase) missing.push('строчная буква');
    if (!requirements.number) missing.push('цифра');
    if (!requirements.special) missing.push('спецсимвол');
    
    if (missing.length > 0) {
      feedback = `Нужно: ${missing.join(', ')}`;
    } else {
      feedback = messages[score - 1] || 'Отличный';
    }

    return {
      score,
      feedback,
      color: colors[Math.min(score, 4)],
      requirements
    };
  }, []);

  // Email validation function
  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      message: isValid ? '' : 'Введите корректный email адрес'
    };
  }, []);

  // Handle password change with real-time validation
  const handlePasswordChange = (password: string) => {
    setRegisterForm(prev => ({ ...prev, password }));
    setPasswordStrength(validatePassword(password));
    
    // Clear password error if validation passes
    if (password.length > 0) {
      const validation = validatePassword(password);
      if (validation.score >= 3) {
        setErrors(prev => ({ ...prev, password: '' }));
      }
    }
  };

  // Handle email change with validation
  const handleEmailChange = (email: string) => {
    setRegisterForm(prev => ({ ...prev, email }));
    
    // Clear email error if validation passes
    if (email.length > 0) {
      const validation = validateEmail(email);
      if (validation.isValid) {
        setErrors(prev => ({ ...prev, email: '' }));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest('/api/auth/login', {
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
    setIsSubmitting(true);
    setErrors({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      general: ''
    });
    
    try {
      // Проверяем согласие с правовой информацией
      if (!agreementChecked) {
        setErrors(prev => ({ ...prev, general: "Необходимо принять соглашение для продолжения регистрации" }));
        setIsSubmitting(false);
        return;
      }

      // Frontend validation before sending request
      const newErrors: any = {};
      
      if (!registerForm.firstName.trim()) newErrors.firstName = 'Обязательное поле';
      if (!registerForm.lastName.trim()) newErrors.lastName = 'Обязательное поле';
      if (!registerForm.username.trim()) newErrors.username = 'Обязательное поле';
      
      const emailValidation = validateEmail(registerForm.email);
      if (!emailValidation.isValid) newErrors.email = emailValidation.message;
      
      const passwordValidation = validatePassword(registerForm.password);
      if (passwordValidation.score < 3) {
        newErrors.password = 'Пароль слишком слабый. ' + passwordValidation.feedback;
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store user email for session management
        localStorage.setItem('userEmail', data.data.user.email);
        
        toast({
          title: "Регистрация успешна",
          description: "Добро пожаловать в SREDA Market",
        });
        
        // Redirect to main page after successful registration
        window.location.href = '/';
      } else {
        // Handle specific server errors
        if (response.status === 409) {
          if (data.error?.includes('email')) {
            setErrors(prev => ({ ...prev, email: 'Пользователь с таким email уже существует' }));
          } else if (data.error?.includes('username')) {
            setErrors(prev => ({ ...prev, username: 'Это имя пользователя уже занято' }));
          } else {
            setErrors(prev => ({ ...prev, general: 'Пользователь с такими данными уже существует' }));
          }
        } else if (response.status === 429) {
          setErrors(prev => ({ ...prev, general: data.error || 'Слишком много попыток. Попробуйте позже.' }));
        } else if (response.status === 422) {
          // Validation errors from server
          if (data.errors) {
            const serverErrors: any = {};
            data.errors.forEach((err: any) => {
              serverErrors[err.field] = err.message;
            });
            setErrors(serverErrors);
          } else {
            setErrors(prev => ({ ...prev, general: data.error || 'Ошибка валидации данных' }));
          }
        } else {
          setErrors(prev => ({ ...prev, general: data.error || 'Произошла ошибка при регистрации' }));
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle different types of errors more specifically
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
        setErrors(prev => ({ 
          ...prev,
          general: 'Ошибка сети. Проверьте подключение к интернету.' 
        }));
      } else if (error.message?.includes('JSON')) {
        setErrors(prev => ({ 
          ...prev,
          general: 'Ошибка обработки ответа сервера. Попробуйте еще раз.' 
        }));
      } else {
        setErrors(prev => ({ 
          ...prev,
          general: 'Произошла неожиданная ошибка. Попробуйте еще раз.' 
        }));
      }
    } finally {
      setIsSubmitting(false);
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
                  {/* General error display */}
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-700">{errors.general}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Имя *</Label>
                      <Input
                        id="firstName"
                        placeholder="Иван"
                        value={registerForm.firstName}
                        onChange={(e) => {
                          setRegisterForm({ ...registerForm, firstName: e.target.value });
                          if (e.target.value.trim()) setErrors(prev => ({ ...prev, firstName: '' }));
                        }}
                        className={errors.firstName ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {errors.firstName && (
                        <span className="text-xs text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.firstName}</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Фамилия *</Label>
                      <Input
                        id="lastName"
                        placeholder="Иванов"
                        value={registerForm.lastName}
                        onChange={(e) => {
                          setRegisterForm({ ...registerForm, lastName: e.target.value });
                          if (e.target.value.trim()) setErrors(prev => ({ ...prev, lastName: '' }));
                        }}
                        className={errors.lastName ? 'border-red-500 focus:border-red-500' : ''}
                      />
                      {errors.lastName && (
                        <span className="text-xs text-red-500 flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>{errors.lastName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Имя пользователя *</Label>
                    <Input
                      id="username"
                      placeholder="ivan_ivanov"
                      value={registerForm.username}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, username: e.target.value });
                        if (e.target.value.trim()) setErrors(prev => ({ ...prev, username: '' }));
                      }}
                      className={errors.username ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {errors.username && (
                      <span className="text-xs text-red-500 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.username}</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerForm.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
                    />
                    {errors.email && (
                      <span className="text-xs text-red-500 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.email}</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="register-password">Пароль *</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Минимум 8 символов"
                        value={registerForm.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className={errors.password ? 'border-red-500 focus:border-red-500 pr-10' : 'pr-10'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {/* Password strength indicator */}
                    {registerForm.password && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={(passwordStrength.score / 5) * 100} 
                            className="flex-1 h-2"
                            style={{
                              '--progress-background': passwordStrength.color,
                            } as React.CSSProperties}
                          />
                          <span className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                            {passwordStrength.score}/5
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: passwordStrength.color }}>
                          {passwordStrength.feedback}
                        </div>
                        
                        {/* Password requirements checklist */}
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className={`flex items-center space-x-1 ${passwordStrength.requirements.length ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.requirements.length ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            <span>8+ символов</span>
                          </div>
                          <div className={`flex items-center space-x-1 ${passwordStrength.requirements.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.requirements.uppercase ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            <span>A-Z</span>
                          </div>
                          <div className={`flex items-center space-x-1 ${passwordStrength.requirements.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.requirements.lowercase ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            <span>a-z</span>
                          </div>
                          <div className={`flex items-center space-x-1 ${passwordStrength.requirements.number ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.requirements.number ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            <span>0-9</span>
                          </div>
                          <div className={`flex items-center space-x-1 ${passwordStrength.requirements.special ? 'text-green-600' : 'text-gray-400'}`}>
                            {passwordStrength.requirements.special ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            <span>!@#$</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {errors.password && (
                      <span className="text-xs text-red-500 flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{errors.password}</span>
                      </span>
                    )}
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

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || !agreementChecked}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Регистрируемся...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Зарегистрироваться
                      </>
                    )}
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