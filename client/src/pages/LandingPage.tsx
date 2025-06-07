
import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/Footer';
import { 
  Building2, 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Users, 
  Star,
  Check,
  ArrowRight,
  Brain,
  Calculator,
  MapPin,
  Target
} from 'lucide-react';

export default function LandingPage() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
      title: "Инвестиционная аналитика",
      description: "Расчет доходности, рисков и прогнозов для каждого объекта недвижимости"
    },
    {
      icon: <Map className="h-8 w-8 text-green-600" />,
      title: "Интерактивная карта",
      description: "Поиск объектов на карте с фильтрами и детальной информацией"
    },
    {
      icon: <Brain className="h-8 w-8 text-purple-600" />,
      title: "ИИ-помощник",
      description: "Умный анализ рынка и персональные рекомендации"
    },
    {
      icon: <Calculator className="h-8 w-8 text-orange-600" />,
      title: "Калькулятор доходности",
      description: "Точные расчеты ROI, срока окупаемости и денежных потоков"
    }
  ];

  const plans = [
    {
      name: "Базовый",
      price: "Бесплатно",
      description: "Для начинающих инвесторов",
      features: [
        "Просмотр до 10 объектов в день",
        "Базовая аналитика",
        "Доступ к карте",
        "Техподдержка"
      ],
      buttonText: "Начать бесплатно",
      popular: false
    },
    {
      name: "Профессиональный",
      price: "2 990 ₽/мес",
      description: "Для активных инвесторов",
      features: [
        "Неограниченный просмотр объектов",
        "Полная инвестиционная аналитика",
        "ИИ-рекомендации",
        "Экспорт отчетов",
        "Приоритетная поддержка"
      ],
      buttonText: "Выбрать план",
      popular: true
    },
    {
      name: "Корпоративный",
      price: "Индивидуально",
      description: "Для компаний и фондов",
      features: [
        "Все возможности Pro",
        "API доступ",
        "Персональный менеджер",
        "Кастомная интеграция",
        "SLA гарантии"
      ],
      buttonText: "Связаться с нами",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                SREDA Market
              </h1>
            </div>
            <Button 
              onClick={() => setLocation('/login')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Войти / Регистрация
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
            🚀 Smart Real Estate Analytics
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Умная платформа для
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {" "}инвестиций в недвижимость
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Анализируйте рынок недвижимости с помощью ИИ, находите выгодные объекты 
            и принимайте обоснованные инвестиционные решения
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => setLocation('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
            >
              Начать инвестировать
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-3"
            >
              Посмотреть демо
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Все инструменты для успешных инвестиций
            </h2>
            <p className="text-lg text-gray-600">
              Комплексная платформа для анализа и выбора недвижимости
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-gray-50 rounded-full w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-blue-200">Объектов в базе</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">12.4%</div>
              <div className="text-blue-200">Средняя доходность</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2,500+</div>
              <div className="text-blue-200">Активных инвесторов</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-200">Точность прогнозов</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Выберите подходящий тариф
            </h2>
            <p className="text-lg text-gray-600">
              Начните с бесплатного тарифа или выберите Pro для полного доступа
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                    Популярный
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-blue-600 my-4">{plan.price}</div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => setLocation('/login')}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Готовы начать инвестировать в недвижимость?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Присоединяйтесь к тысячам успешных инвесторов уже сегодня
          </p>
          <Button 
            size="lg" 
            onClick={() => setLocation('/login')}
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            Зарегистрироваться бесплатно
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
