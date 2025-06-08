import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingUp, Bot, Check, X, Clock, Shield, Phone, Mail, Database, BarChart3, Search, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function Landing() {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState('01:00:59');
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promocode, setPromocode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seconds, setSeconds] = useState(3659); // 1 час 59 секунд
  const [animatedMetrics, setAnimatedMetrics] = useState<Array<{ id: number; value: string; label: string; x: number; y: number; visible: boolean }>>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const [typedText, setTypedText] = useState('');
  const animationRef = useRef<{ interval?: NodeJS.Timeout; timeout?: NodeJS.Timeout }>({});

  const searchQueries = [
    'Выгодные квартиры в Москве с высокой доходностью',
    'Инвестиции в недвижимость Санкт-Петербурга',
    'Доходная недвижимость в Казани под инвестиции',
    'Квартиры с высоким ROI в Перми',
    'Инвестиционные объекты в Екатеринбурге',
    'Недвижимость в Тюмени для инвестора',
    'Выгодные вложения в квартиры Уфы',
    'Инвестиции в недвижимость Сочи'
  ];

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

  // Анимация набора текста
  useEffect(() => {
    const startTypingAnimation = () => {
      // Очищаем предыдущие таймеры
      if (animationRef.current.interval) clearInterval(animationRef.current.interval);
      if (animationRef.current.timeout) clearTimeout(animationRef.current.timeout);
      
      const currentQuery = searchQueries[currentSearchIndex];
      let currentChar = 0;
      
      setTypedText('');
      
      animationRef.current.interval = setInterval(() => {
        if (currentChar <= currentQuery.length) {
          setTypedText(currentQuery.slice(0, currentChar));
          currentChar++;
        } else {
          if (animationRef.current.interval) clearInterval(animationRef.current.interval);
          // Переходим к следующему запросу через 2 секунды
          animationRef.current.timeout = setTimeout(() => {
            setCurrentSearchIndex((prev) => (prev + 1) % searchQueries.length);
          }, 2000);
        }
      }, 100);
    };

    const timer = setTimeout(startTypingAnimation, 500);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current.interval) clearInterval(animationRef.current.interval);
      if (animationRef.current.timeout) clearTimeout(animationRef.current.timeout);
    };
  }, [currentSearchIndex]);

  // Таймер обратного отсчета
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prevSeconds => {
        if (prevSeconds <= 0) return 0;
        
        const newSeconds = prevSeconds - 1;
        const hours = Math.floor(newSeconds / 3600);
        const minutes = Math.floor((newSeconds % 3600) / 60);
        const secs = newSeconds % 60;
        
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Генерация промокода
  const generatePromocode = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/promocodes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPromocode(data.data.code);
        setIsPromoModalOpen(true);
        toast({
          title: "Промокод создан!",
          description: "Ваш промокод готов к использованию",
        });
      } else {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error(errorData.error || 'Превышен лимит создания промокодов');
        }
        throw new Error(errorData.error || 'Failed to generate promocode');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Не удалось создать промокод. Попробуйте позже.";
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Копирование промокода в буфер обмена
  const copyPromocode = () => {
    if (promocode) {
      navigator.clipboard.writeText(promocode);
      toast({
        title: "Скопировано!",
        description: "Промокод скопирован в буфер обмена",
      });
    }
  };

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
      title: "AI-ассистент",
      description: "Персональные рекомендации",
      details: "Анализ рынка, оценка рисков и инвестиционные стратегии"
    },
    {
      icon: <MapPin className="h-8 w-8 text-orange-600" />,
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
        { name: "Экспорт в PDF", basic: false, premium: false },
        { name: "Инсайты рынка", basic: false, premium: false },
        { name: "Поддержка 24/7", basic: false, premium: false },

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
        { name: "Экспорт в PDF", basic: false, premium: true },
        { name: "Инсайты рынка", basic: false, premium: true },
        { name: "Поддержка 24/7", basic: true, premium: true },

      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Навигация */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-50">
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
              <Button className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white font-semibold text-xs sm:text-sm px-3 sm:px-6 py-2 sm:py-3 rounded-md shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-0 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 hidden sm:inline font-quantum tracking-wide">Вход / Регистрация</span>
                <span className="relative z-10 sm:hidden font-quantum tracking-wide">Вход</span>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
              </Button>
            </Link>
          </div>
        </div>
      </header>
      {/* Hero секция */}
      <section className="pt-36 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            AI платформа для поиска{' '}
            <span className="text-blue-600">инвестиционной недвижимости</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto px-4">
            AI-анализ 15,000+ объектов в реальном времени<br />
            Находите выгодные объекты за минуты
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                Начать поиск
              </Button>
            </Link>
          </div>

          {/* 3D визуализация тепловой карты */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-100 via-green-100 to-yellow-100 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              
              {/* Поисковая строка поверх карты */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[80%] md:w-[70%] z-10">
                <div className="relative">
                  <div className="bg-white rounded-full shadow-2xl border border-gray-200 flex items-center px-3 sm:px-4 md:px-6 py-3 md:py-4 hover:shadow-3xl transition-shadow duration-300">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mr-2 sm:mr-3 md:mr-4 flex-shrink-0" />
                    <input
                      type="text"
                      value={typedText}
                      readOnly
                      className="flex-1 text-xs sm:text-sm md:text-base text-gray-700 bg-transparent border-none outline-none placeholder:text-gray-400 cursor-default"
                      placeholder=""
                    />
                    <div className="flex items-center ml-2 sm:ml-3 md:ml-4">
                      <span className="text-xs sm:text-sm font-quantum font-semibold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-300 tracking-wider">
                        AI SREDA
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
                  className="absolute bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-md rounded-xl p-3 shadow-2xl border-2 border-blue-200/60 pointer-events-none transform transition-all duration-300 hover:scale-110"
                  style={{
                    left: `${metric.x}%`,
                    top: `${metric.y}%`,
                    animation: 'floatIn 0.6s ease-out forwards, fadeOut 2.4s ease-in 2.6s forwards',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full animate-pulse"></div>
                    <div className="text-sm font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      {metric.value}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 font-medium mt-1">{metric.label}</div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-sm animate-ping"></div>
                </div>
              ))}

            </div>
          </div>
        </div>
      </section>
      {/* Возможности платформы */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Возможности платформы
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">Комплекс инструментов для профессионалов рынка</p>
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Тарифные планы
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4">Выберите подходящий план</p>
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
                  <CardTitle className="text-xl sm:text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600">
                    {plan.price}
                    <span className="text-base sm:text-lg text-gray-600 font-normal">{plan.period}</span>
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

                  <Link href="/login" className="w-full">
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
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Финальный CTA */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Получите персональный промокод</h2>
          <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-8 px-4">
            на безлимитное тестирование всех возможностей платформы<br />
            Smart Real Estate Data Analytics
          </p>

          {/* Таймер */}
          <div className="bg-white/10 rounded-lg p-6 mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm">Предложение действует</span>
            </div>
            <div className="text-3xl font-bold font-mono">{timeLeft}</div>
          </div>

          {/* Кнопка генерации промокода */}
          <div className="max-w-md mx-auto">
            <Button 
              size="lg" 
              className="w-full px-8 py-4 text-lg font-semibold mb-4 bg-orange-500 hover:bg-orange-600 text-white border-none"
              onClick={generatePromocode}
              disabled={isGenerating}
            >
              {isGenerating ? "Генерируем промокод..." : "Получить промокод"}
            </Button>

          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 px-4 font-mono">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* О сервисе */}
            <div>
              <h3 className="text-base sm:text-lg font-quantum font-bold mb-3 tracking-wider">SREDA Market</h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                Аналитическая платформа для инвестиций в недвижимость с AI-агентом, 
                инвестиционными рейтингами, прогнозами цен и комплексным анализом рынка.
              </p>
            </div>

            {/* Реквизиты */}
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-3">Реквизиты</h3>
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
              <h3 className="text-base sm:text-lg font-bold mb-3">Правовые документы</h3>
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
      {/* Модальное окно с промокодом */}
      <Dialog open={isPromoModalOpen} onOpenChange={setIsPromoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">🎉 Ваш промокод готов!</DialogTitle>
            <DialogDescription className="text-center">
              Промокод дает вам полный доступ ко всем функциям на 24 часа
            </DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-4">
            
            {promocode && (
              <div className="bg-gray-50 border-2 border-dashed border-blue-300 rounded-lg p-4">
                <div className="text-2xl font-mono font-bold text-blue-600 tracking-wider">
                  {promocode}
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button 
                onClick={copyPromocode}
                className="flex-1"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Скопировать
              </Button>
              
              <Link href="/register" className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Зарегистрироваться
                </Button>
              </Link>
            </div>
            
            <p className="text-sm text-gray-500">
              После регистрации введите этот промокод в разделе "Промокоды"
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}