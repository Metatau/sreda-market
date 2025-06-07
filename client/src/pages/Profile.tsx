
import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  Bell, 
  Heart, 
  Scale, 
  MessageSquare, 
  BarChart3,
  Edit3,
  Save,
  X,
  Crown,
  Check,
  CreditCard,
  Users,
  Copy
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function Profile() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Войдите в аккаунт
              </h2>
              <p className="text-gray-600">
                Для просмотра профиля необходимо войти в систему
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [promoCodes, setPromoCodes] = useState({
    promo: '',
    standard: '',
    professional: ''
  });
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    paidReferrals: 0,
    totalEarned: 0,
    totalSpent: 0,
    bonusBalance: 0
  });
  const [referralCode, setReferralCode] = useState('');
  const [bonusCalculation, setBonusCalculation] = useState({
    originalPrice: 0,
    finalPrice: 0,
    bonusUsed: 0,
    bonusAvailable: 0,
    savings: 0
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadReferralStats();
      generateReferralCode();
    }
  }, [isAuthenticated, user]);

  const loadReferralStats = async () => {
    try {
      const response = await fetch('/api/referrals/stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const stats = await response.json();
        setReferralStats({
          totalReferrals: stats.totalReferrals || 0,
          paidReferrals: stats.paidReferrals || 0,
          totalEarned: stats.totalEarned || 0,
          totalSpent: stats.totalSpent || 0,
          bonusBalance: stats.bonusBalance || 0
        });
      }
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  const generateReferralCode = () => {
    if (user?.name) {
      const code = `${user.name.substring(0, 6).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setReferralCode(code);
    }
  };

  const calculatePrice = async (plan: string) => {
    const planPrices = {
      promo: 0,
      standard: 990,
      professional: 2490
    };

    const originalPrice = planPrices[plan as keyof typeof planPrices] || 0;

    try {
      const response = await fetch('/api/payments/calculate-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originalPrice }),
      });

      if (response.ok) {
        const calculation = await response.json();
        setBonusCalculation(calculation);
        return calculation;
      }
    } catch (error) {
      console.error('Error calculating price:', error);
    }

    return {
      originalPrice,
      finalPrice: originalPrice,
      bonusUsed: 0,
      bonusAvailable: 0,
      savings: 0
    };
  };

  const handleSave = () => {
    // В реальном приложении здесь бы отправлялся запрос на сервер
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(user.name);
    setIsEditing(false);
  };

  const handlePayment = async (plan: string) => {
    try {
      setPaymentLoading(plan);
      
      const promoCode = promoCodes[plan as keyof typeof promoCodes];
      
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          promoCode,
          email: 'user@example.com', // В реальном приложении получать из профиля пользователя
          returnUrl: window.location.origin + '/profile?tab=subscription'
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (plan === 'promo') {
          alert('Промо план активирован бесплатно на 30 дней!');
        } else if (data.paymentUrl) {
          // Перенаправляем на страницу оплаты Бланк банка
          window.location.href = data.paymentUrl;
        }
      } else {
        alert('Ошибка создания платежа: ' + data.error);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Произошла ошибка при создании платежа');
    } finally {
      setPaymentLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Профиль Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="text-2xl font-bold h-auto border-none p-0 focus-visible:ring-0"
                      />
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-gray-600">ID: {user.id}</p>
                {user.roles && (
                  <div className="mt-2">
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-medium border">{user.roles}</Badge>
                  </div>
                )}
              </div>
              
              <Button variant="destructive" onClick={logout}>
                Выйти
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Активность
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Избранное
            </TabsTrigger>
            <TabsTrigger value="comparisons" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Сравнения
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Подписка
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Статистика активности
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">0</div>
                    <div className="text-sm text-gray-600">Просмотров объектов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-500">0</div>
                    <div className="text-sm text-gray-600">В избранном</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">0</div>
                    <div className="text-sm text-gray-600">Сравнений</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Последние чаты с AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  История чатов будет отображаться здесь
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Избранные объекты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  У вас пока нет избранных объектов
                </p>
                <div className="text-center">
                  <Button onClick={() => window.location.href = '/'}>
                    Найти недвижимость
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparisons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Списки сравнения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  У вас нет активных сравнений
                </p>
                <div className="text-center">
                  <Button onClick={() => window.location.href = '/comparison'}>
                    Создать сравнение
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Планы подписки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Промо тариф */}
                  <Card className="relative border-2 border-gray-200 hover:border-blue-300 transition-colors">
                    <CardHeader className="text-center">
                      <Badge className="mx-auto w-fit bg-green-100 text-green-700 border-green-200 font-medium border">
                        Промо
                      </Badge>
                      <div className="mt-4">
                        <div className="text-3xl font-bold text-gray-900">Бесплатно</div>
                        <div className="text-sm text-gray-600">на 3 дня</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          1 запрос к AI в день
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Базовый анализ инвестиций
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Доступ к карте недвижимости
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          До 10 избранных объектов
                        </li>
                      </ul>
                      <div className="space-y-3">
                        <Input
                          placeholder="Промокод"
                          value={promoCodes.promo}
                          onChange={(e) => setPromoCodes(prev => ({...prev, promo: e.target.value}))}
                        />
                        <Button 
                          className="w-full" 
                          onClick={() => handlePayment('promo')}
                          disabled={paymentLoading === 'promo'}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {paymentLoading === 'promo' ? 'Активация...' : 'Активировать'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Стандарт тариф */}
                  <Card className="relative border-2 border-blue-300 hover:border-blue-400 transition-colors">
                    <CardHeader className="text-center">
                      <Badge className="mx-auto w-fit bg-blue-100 text-blue-700 border-blue-200 font-medium border">
                        Стандарт
                      </Badge>
                      <div className="mt-4">
                        <div className="text-3xl font-bold text-gray-900">₽990</div>
                        <div className="text-sm text-gray-600">в месяц</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          10 запросов к AI в день
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Расширенный анализ инвестиций
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Прогнозы цен на недвижимость
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Неограниченное избранное
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Сравнение до 5 объектов
                        </li>
                      </ul>
                      <div>
                        <Button 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => handlePayment('standard')}
                          disabled={paymentLoading === 'standard'}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {paymentLoading === 'standard' ? 'Обработка...' : 'Оплатить ₽990'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Профи тариф */}
                  <Card className="relative border-2 border-purple-300 hover:border-purple-400 transition-colors">
                    <CardHeader className="text-center">
                      <Badge className="mx-auto w-fit bg-purple-100 text-purple-700 border-purple-200 font-medium border">
                        Профи
                      </Badge>
                      <div className="mt-4">
                        <div className="text-3xl font-bold text-gray-900">₽2490</div>
                        <div className="text-sm text-gray-600">в месяц</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          30 запросов к AI в день
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Экспертный анализ инвестиций
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Персональные рекомендации
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Приоритетная поддержка
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Неограниченные сравнения
                        </li>
                      </ul>
                      <div>
                        <Button 
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          onClick={() => handlePayment('professional')}
                          disabled={paymentLoading === 'professional'}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {paymentLoading === 'professional' ? 'Обработка...' : 'Оплатить ₽2490'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Реферальная программа */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Реферальная программа
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Приглашайте друзей и получайте бонусы на свой счет
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Информация о бонусном счете */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Бонусный счет</span>
                    <span className="text-2xl font-bold text-blue-600">₽{referralStats.bonusBalance}</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Можно использовать до 50% от стоимости тарифа
                  </p>
                </div>

                {/* Реферальная ссылка и промокод */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="referral-link" className="text-sm font-medium">
                      Реферальная ссылка
                    </Label>
                    <div className="flex mt-1">
                      <Input
                        id="referral-link"
                        value={`https://sreda.market/ref/${referralCode}`}
                        readOnly
                        className="rounded-r-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-l-none border-l-0"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://sreda.market/ref/${referralCode}`);
                          alert("Ссылка скопирована!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="referral-code" className="text-sm font-medium">
                      Промокод
                    </Label>
                    <div className="flex mt-1">
                      <Input
                        id="referral-code"
                        value={referralCode}
                        readOnly
                        className="rounded-r-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-l-none border-l-0"
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode);
                          alert("Промокод скопирован!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Правила программы */}
                <div>
                  <h4 className="font-medium mb-3">Как это работает:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">1</span>
                      </div>
                      <p className="text-sm text-gray-700">Поделитесь реферальной ссылкой и промокодом с коллегами и друзьями</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">2</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        Когда друг оплачивает любой тариф, вы получаете <span className="font-medium text-blue-600">20% бонусов</span> на свой счет
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-600">3</span>
                      </div>
                      <p className="text-sm text-gray-700">
                        Используйте бонусы для оплаты <span className="font-medium text-blue-600">до 50%</span> стоимости своего тарифа
                      </p>
                    </div>
                  </div>
                </div>

                {/* Статистика рефералов */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{referralStats.totalReferrals}</div>
                    <div className="text-xs text-gray-600">Приглашено</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{referralStats.paidReferrals}</div>
                    <div className="text-xs text-gray-600">Оплатили</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">₽{referralStats.totalEarned}</div>
                    <div className="text-xs text-gray-600">Заработано</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">₽{referralStats.totalSpent}</div>
                    <div className="text-xs text-gray-600">Потрачено</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Уведомления
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email уведомления</Label>
                    <p className="text-sm text-gray-600">Получать уведомления на почту</p>
                  </div>
                  <input type="checkbox" id="email-notifications" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="price-alerts">Уведомления о ценах</Label>
                    <p className="text-sm text-gray-600">Получать уведомления об изменении цен</p>
                  </div>
                  <input type="checkbox" id="price-alerts" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="new-properties">Новые объекты</Label>
                    <p className="text-sm text-gray-600">Уведомления о новых объектах по вашим критериям</p>
                  </div>
                  <input type="checkbox" id="new-properties" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Настройки аккаунта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="user-id">ID пользователя</Label>
                  <Input id="user-id" value={user.id} disabled />
                </div>
                
                <div>
                  <Label htmlFor="user-name">Имя пользователя</Label>
                  <Input id="user-name" value={user.name} disabled />
                </div>
                
                {user.roles && (
                  <div>
                    <Label htmlFor="user-roles">Роли</Label>
                    <Input id="user-roles" value={user.roles} disabled />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
