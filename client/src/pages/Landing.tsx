import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, Bot, Map, Check, X, Clock, Shield, Phone, Mail, Database, BarChart3 } from 'lucide-react';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState('07:59:32');
  const [animatedMetrics, setAnimatedMetrics] = useState<Array<{ id: number; value: string; label: string; x: number; y: number; visible: boolean }>>([]);

  const metrics = [
    { value: '+12.5%', label: 'ROI' },
    { value: '₽8.2M', label: 'Средняя цена' },
    { value: '95%', label: 'Ликвидность' },
    { value: '+5.8%', label: 'Рост цен' },
    { value: '3.2 года', label: 'Окупаемость' },
    { value: '₽125K/м²', label: 'Цена за м²' },
    { value: '89%', label: 'Заполняемость' },
    { value: '+15.3%', label: 'Доходность' },
    { value: '42 дня', label: 'Время продажи' },
    { value: '₽35K', label: 'Аренда/мес' },
  ];

  // Анимация всплывающих метрик
  useEffect(() => {
    const addMetric = () => {
      const metric = metrics[Math.floor(Math.random() * metrics.length)];
      const newMetric = {
        id: Date.now() + Math.random(),
        value: metric.value,
        label: metric.label,
        x: Math.random() * 80 + 10, // 10% to 90% width
        y: Math.random() * 80 + 10, // 10% to 90% height
        visible: true,
      };

      setAnimatedMetrics(prev => [...prev, newMetric]);

      // Удаляем метрику через 3 секунды
      setTimeout(() => {
        setAnimatedMetrics(prev => prev.filter(m => m.id !== newMetric.id));
      }, 3000);
    };

    // Добавляем новую метрику каждые 2-4 секунды
    const interval = setInterval(() => {
      addMetric();
    }, 2000 + Math.random() * 2000);

    // Добавляем первую метрику сразу
    addMetric();

    return () => clearInterval(interval);
  }, []);

  // Таймер обратного отсчета
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const endTime = now + (7 * 60 + 59) * 1000; // 7:59
      const distance = endTime - now;
      
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: <MapPin className="h-8 w-8 text-blue-600" />,
      title: "Поиск объектов",
      description: "Фильтры по 25+ параметрам для точного поиска недвижимости",
      details: "Площадь, район, цена, доходность, ликвидность и многое другое"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-600" />,
      title: "ROI калькулятор", 
      description: "Динамический расчёт доходности в реальном времени",
      details: "Учет всех расходов, налогов и прогноз на 3 года"
    },
    {
      icon: <Bot className="h-8 w-8 text-purple-600" />,
      title: "AI-советник",
      description: "Персональные рекомендации на базе ChatGPT",
      details: "Анализ рынка, оценка рисков и инвестиционные стратегии"
    },
    {
      icon: <Map className="h-8 w-8 text-orange-600" />,
      title: "Геоаналитика",
      description: "Анализ инфраструктуры и потенциала развития",
      details: "Транспорт, школы, больницы, планы застройки"
    },
    {
      icon: <Database className="h-8 w-8 text-indigo-600" />,
      title: "База объектов",
      description: "Обширная база недвижимости со всей России",
      details: "Актуальные данные о ценах, характеристиках и доходности"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-teal-600" />,
      title: "Инсайты рынка",
      description: "Аналитические отчеты и прогнозы развития рынка",
      details: "Тренды цен, перспективные районы, рыночные сводки"
    }
  ];

  const plans = [
    {
      name: "Базовый",
      price: "₽2,990",
      period: "/месяц",
      features: [
        { name: "AI-запросов/день", basic: "10", premium: false },
        { name: "Глубина анализа", basic: "1 год", premium: false },
        { name: "Экспорт в Excel", basic: false, premium: false },
        { name: "API доступ", basic: false, premium: false },
        { name: "Поддержка 24/7", basic: true, premium: false },
        { name: "Мобильное приложение", basic: true, premium: false }
      ]
    },
    {
      name: "Премиум",
      price: "₽7,990",
      period: "/месяц",
      popular: true,
      features: [
        { name: "AI-запросов/день", basic: "10", premium: "∞" },
        { name: "Глубина анализа", basic: "1 год", premium: "3 года" },
        { name: "Экспорт в Excel", basic: false, premium: true },
        { name: "API доступ", basic: false, premium: true },
        { name: "Поддержка 24/7", basic: true, premium: true },
        { name: "Мобильное приложение", basic: true, premium: true }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Навигация */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-quantum">SREDA Market</span>
            </Link>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">
                Возможности
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">
                Тарифы
              </a>
            </nav>

            <Link href="/login">
              <Button variant="outline" className="hover:bg-blue-50">
                Вход / Регистрация
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero секция */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            AI платформа для поиска{' '}
            <span className="text-blue-600">инвестиционной недвижимости</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-анализ 15,000+ объектов в реальном времени. 
            Находите выгодные инвестиции за минуты, а не месяцы.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              Начать поиск
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              Смотреть демо
            </Button>
          </div>

          {/* 3D визуализация тепловой карты */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-100 via-green-100 to-yellow-100 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="grid grid-cols-6 gap-2 h-64">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-lg opacity-80 hover:opacity-100 transition-all cursor-pointer transform hover:scale-105 animate-pulse ${
                      i % 4 === 0 ? 'bg-red-400' :
                      i % 4 === 1 ? 'bg-yellow-400' :
                      i % 4 === 2 ? 'bg-green-400' : 'bg-blue-400'
                    }`}
                    style={{
                      height: `${Math.random() * 60 + 40}%`,
                      marginTop: `${Math.random() * 20}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
              
              {/* Всплывающие метрики */}
              {animatedMetrics.map((metric) => (
                <div
                  key={metric.id}
                  className="absolute bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-white/50 pointer-events-none animate-bounce"
                  style={{
                    left: `${metric.x}%`,
                    top: `${metric.y}%`,
                    animationDuration: '0.6s',
                    animationIterationCount: '3'
                  }}
                >
                  <div className="text-xs font-bold text-gray-800">{metric.value}</div>
                  <div className="text-xs text-gray-600">{metric.label}</div>
                </div>
              ))}
              
              <div className="mt-4 text-sm text-gray-600">
                Интерактивная тепловая карта цен по районам Москвы
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Возможности платформы */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Возможности платформы
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Полный набор инструментов для профессионального анализа недвижимости
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 mb-3">{feature.description}</p>
                  <p className="text-sm text-gray-500">{feature.details}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Тарифные планы */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Тарифные планы
            </h2>
            <p className="text-xl text-gray-600">
              Выберите подходящий план для ваших инвестиций
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'ring-2 ring-blue-600 shadow-xl' : 'shadow-lg'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Популярный
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-blue-600">
                    {plan.price}
                    <span className="text-lg text-gray-600 font-normal">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center justify-between">
                        <span className="text-gray-700">{feature.name}</span>
                        <div className="flex items-center">
                          {index === 0 ? (
                            typeof feature.basic === 'boolean' ? (
                              feature.basic ? (
                                <Check className="h-5 w-5 text-green-600" />
                              ) : (
                                <X className="h-5 w-5 text-gray-400" />
                              )
                            ) : (
                              <span className="text-sm text-gray-600">{feature.basic}</span>
                            )
                          ) : (
                            typeof feature.premium === 'boolean' ? (
                              feature.premium ? (
                                <Check className="h-5 w-5 text-green-600" />
                              ) : (
                                <X className="h-5 w-5 text-gray-400" />
                              )
                            ) : (
                              <span className="text-sm text-blue-600 font-semibold">{feature.premium}</span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-800 hover:bg-gray-900'
                    }`}
                    size="lg"
                  >
                    Выбрать план
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Финальный CTA */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Получите персональный отчёт
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Анализ лучших инвестиционных объектов в вашем регионе
          </p>

          {/* Таймер */}
          <div className="bg-white/10 rounded-lg p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm">Предложение действует</span>
            </div>
            <div className="text-3xl font-bold font-mono">{timeLeft}</div>
          </div>

          {/* Форма */}
          <div className="max-w-md mx-auto">
            <div className="flex gap-2 mb-4">
              <Input
                type="email"
                placeholder="Ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white text-gray-900"
              />
              <Button variant="secondary" size="lg" className="px-8">
                Получить
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-100">
              <Shield className="h-4 w-4" />
              <span>30 дней возврата средств</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 font-mono">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* О сервисе */}
            <div>
              <h3 className="text-lg font-quantum font-bold mb-3 tracking-wider">SREDA Market</h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Аналитическая платформа для инвестиций в недвижимость с AI-агентом, 
                инвестиционными рейтингами, прогнозами цен и комплексным анализом рынка.
              </p>
            </div>

            {/* Реквизиты */}
            <div>
              <h3 className="text-lg font-bold mb-3">Реквизиты</h3>
              <div className="space-y-1 text-xs text-gray-300">
                <p className="font-medium">ИП Шинкаренко А.А.</p>
                <p>ОГРНИП: 315595800025579</p>
                <p>ИНН: 590401203802</p>
                
                <div className="flex items-center space-x-2 mt-2">
                  <Phone className="w-3 h-3" />
                  <a href="tel:+78001015159" className="hover:text-blue-400 transition-colors">
                    8 800 101 51 59
                  </a>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Mail className="w-3 h-3" />
                  <a href="mailto:info@monodigitalstudio.ru" className="hover:text-blue-400 transition-colors">
                    info@monodigitalstudio.ru
                  </a>
                </div>
              </div>
            </div>

            {/* Правовые документы */}
            <div>
              <h3 className="text-lg font-bold mb-3">Правовые документы</h3>
              <div className="space-y-1">
                <Link href="/politika-konfidencialnosti/" className="block text-xs text-gray-300 hover:text-blue-400 transition-colors">
                  Политика конфиденциальности
                </Link>
                <Link href="/politika-obrabotki-personalnyh-dannyh/" className="block text-xs text-gray-300 hover:text-blue-400 transition-colors">
                  Политика обработки персональных данных
                </Link>
                <Link href="/polzovatelskoe-soglashenie/" className="block text-xs text-gray-300 hover:text-blue-400 transition-colors">
                  Пользовательское соглашение
                </Link>
                <Link href="/publichnaya-oferta/" className="block text-xs text-gray-300 hover:text-blue-400 transition-colors">
                  Публичная оферта
                </Link>
                <Link href="/soglasie-na-obrabotku-personalnyh-dannyh/" className="block text-xs text-gray-300 hover:text-blue-400 transition-colors">
                  Согласие на обработку персональных данных
                </Link>
              </div>
            </div>
          </div>

          {/* Нижняя часть футера */}
          <div className="border-t border-gray-700 mt-6 pt-4">
            <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-400">
              <p>© 2025 SREDA Market. Все права защищены.</p>
              
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}