import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Users, MapPin, Building, DollarSign, AlertTriangle, CheckCircle, Clock, Target } from 'lucide-react';
import { QuarterAnalytics, EnhancedQuarterAnalytics } from '../types/geospatial';
import { GeospatialService } from '../services/GeospatialService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface QuarterAnalyticsPopupProps {
  position: [number, number];
  address?: string;
  onClose: () => void;
}

export function QuarterAnalyticsPopup({ position, address, onClose }: QuarterAnalyticsPopupProps) {
  const [analytics, setAnalytics] = useState<QuarterAnalytics | null>(null);
  const [enhancedAnalytics, setEnhancedAnalytics] = useState<EnhancedQuarterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [enhancedLoading, setEnhancedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lat, lng] = position;

  useEffect(() => {
    loadBasicAnalytics();
  }, [lat, lng]);

  const loadBasicAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await GeospatialService.getQuarterAnalytics(lat, lng);
      setAnalytics(data);
    } catch (err) {
      setError('Не удалось загрузить аналитику района');
      console.error('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEnhancedAnalytics = async () => {
    if (!address) {
      setError('Адрес не определен для расширенного анализа');
      return;
    }

    try {
      setEnhancedLoading(true);
      const data = await GeospatialService.getEnhancedAnalytics(address, lat, lng);
      setEnhancedAnalytics(data);
    } catch (err) {
      setError('Не удалось загрузить расширенную аналитику');
      console.error('Enhanced analytics loading error:', err);
    } finally {
      setEnhancedLoading(false);
    }
  };

  const formatDistance = (distance: number): string => {
    if (distance > 9000) return 'Не найдено';
    if (distance > 1000) return `${(distance / 1000).toFixed(1)} км`;
    return `${Math.round(distance)} м`;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  const getRecommendationColor = (recommendation: 'buy' | 'hold' | 'avoid'): string => {
    switch (recommendation) {
      case 'buy': return 'text-green-600 bg-green-50';
      case 'hold': return 'text-yellow-600 bg-yellow-50';
      case 'avoid': return 'text-red-600 bg-red-50';
    }
  };

  const getRecommendationText = (recommendation: 'buy' | 'hold' | 'avoid'): string => {
    switch (recommendation) {
      case 'buy': return 'Рекомендуем покупку';
      case 'hold': return 'Стоит подождать';
      case 'avoid': return 'Не рекомендуем';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-96 max-h-[90vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Анализ района</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Загрузка аналитики района...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-96 max-h-[90vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Ошибка</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4 py-8">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-gray-600 text-center">{error}</p>
              <Button onClick={loadBasicAnalytics}>Повторить</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-xl">Аналитика района</CardTitle>
            {address && <p className="text-sm text-gray-600 mt-1">{address}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 m-4">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="infrastructure">Инфраструктура</TabsTrigger>
              <TabsTrigger value="economics">Экономика</TabsTrigger>
              <TabsTrigger value="ai-insights" disabled={!enhancedAnalytics}>
                AI-анализ
                {enhancedLoading && <Clock className="h-3 w-3 ml-1 animate-spin" />}
              </TabsTrigger>
            </TabsList>

            <div className="p-4 space-y-4">
              <TabsContent value="overview" className="space-y-4">
                {/* Демография */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Users className="h-5 w-5 mr-2" />
                      Демография
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Плотность населения:</span>
                        <span className="font-medium">{analytics.demographics.population.density.toLocaleString()} чел/км²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Общая численность:</span>
                        <span className="font-medium">{analytics.demographics.population.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Прогноз роста:</span>
                        <Badge variant={analytics.demographics.population.growth_forecast === 'increase' ? 'default' : 'secondary'}>
                          {analytics.demographics.population.growth_forecast === 'increase' ? 'Рост' : 
                           analytics.demographics.population.growth_forecast === 'decrease' ? 'Снижение' : 'Стабильно'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Средний возраст:</span>
                        <span className="font-medium">{Math.round(analytics.demographics.structure.average_age)} лет</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Уровень доходов:</span>
                        <Badge variant={analytics.demographics.structure.income_level === 'high' ? 'default' : 'secondary'}>
                          {analytics.demographics.structure.income_level === 'high' ? 'Высокий' :
                           analytics.demographics.structure.income_level === 'medium' ? 'Средний' : 
                           analytics.demographics.structure.income_level === 'low' ? 'Низкий' : 'Смешанный'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Транспорт */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <MapPin className="h-5 w-5 mr-2" />
                      Транспортная доступность
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">До метро:</span>
                        <span className="font-medium">{formatDistance(analytics.transport.metro_distance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Остановок ОТ:</span>
                        <span className="font-medium">{analytics.transport.public_transport_stops.bus_stops}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ближайшая остановка:</span>
                        <span className="font-medium">{formatDistance(analytics.transport.public_transport_stops.nearest_distance)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Пешеходный трафик:</span>
                        <Badge variant={analytics.transport.pedestrian_traffic === 'high' ? 'default' : 'secondary'}>
                          {analytics.transport.pedestrian_traffic === 'high' ? 'Высокий' :
                           analytics.transport.pedestrian_traffic === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Автомобильный трафик:</span>
                        <Badge variant={analytics.transport.car_traffic === 'high' ? 'destructive' : 'secondary'}>
                          {analytics.transport.car_traffic === 'high' ? 'Высокий' :
                           analytics.transport.car_traffic === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Конкуренция */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Building className="h-5 w-5 mr-2" />
                      Конкурентная среда
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{analytics.competition.new_buildings}</p>
                        <p className="text-xs text-gray-600">Новостройки</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{analytics.competition.secondary_housing}</p>
                        <p className="text-xs text-gray-600">Вторичка</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-600">{analytics.competition.total_competing_objects}</p>
                        <p className="text-xs text-gray-600">Всего объектов</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="infrastructure" className="space-y-4">
                {/* Образование */}
                <Card>
                  <CardHeader>
                    <CardTitle>Образование</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Школы:</span>
                      <span className="font-medium">{analytics.infrastructure.education.schools}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Детские сады:</span>
                      <span className="font-medium">{analytics.infrastructure.education.kindergartens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>До ближайшей школы:</span>
                      <span className="font-medium">{formatDistance(analytics.infrastructure.education.nearest_school_distance)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Здравоохранение */}
                <Card>
                  <CardHeader>
                    <CardTitle>Здравоохранение</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Больницы:</span>
                      <span className="font-medium">{analytics.infrastructure.healthcare.hospitals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Поликлиники:</span>
                      <span className="font-medium">{analytics.infrastructure.healthcare.clinics}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>До ближайшего мед. учреждения:</span>
                      <span className="font-medium">{formatDistance(analytics.infrastructure.healthcare.nearest_medical_distance)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Коммерция и отдых */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Коммерция</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>ТЦ:</span>
                        <span className="font-medium">{analytics.infrastructure.commercial.shopping_centers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Магазины:</span>
                        <span className="font-medium">{analytics.infrastructure.commercial.shops}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Рестораны:</span>
                        <span className="font-medium">{analytics.infrastructure.commercial.restaurants}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Отдых</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Парки:</span>
                        <span className="font-medium">{analytics.infrastructure.recreation.parks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Спорт. объекты:</span>
                        <span className="font-medium">{analytics.infrastructure.recreation.sports_facilities}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>До парка:</span>
                        <span className="font-medium">{formatDistance(analytics.infrastructure.recreation.nearest_park_distance)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Общий балл инфраструктуры */}
                <Card>
                  <CardHeader>
                    <CardTitle>Общая оценка инфраструктуры</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-4">
                      <Progress value={analytics.infrastructure.infrastructure_score} className="flex-1" />
                      <span className="font-bold text-lg">{analytics.infrastructure.infrastructure_score}/100</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="economics" className="space-y-4">
                {/* Цены за м² */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Цены за м² по классам
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Эконом:</span>
                          <span className="font-medium">{formatPrice(analytics.economics.price_per_sqm.economy_class)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Комфорт:</span>
                          <span className="font-medium">{formatPrice(analytics.economics.price_per_sqm.comfort_class)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Бизнес:</span>
                          <span className="font-medium">{formatPrice(analytics.economics.price_per_sqm.business_class)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Элит:</span>
                          <span className="font-medium">{formatPrice(analytics.economics.price_per_sqm.elite_class)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Динамика и активность */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Динамика цен</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Годовой рост:</span>
                          <span className="font-medium text-green-600">+{analytics.economics.price_dynamics.yearly_change.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Тренд:</span>
                          <Badge variant={analytics.economics.price_dynamics.trend === 'growing' ? 'default' : 'secondary'}>
                            {analytics.economics.price_dynamics.trend === 'growing' ? 'Рост' :
                             analytics.economics.price_dynamics.trend === 'falling' ? 'Падение' : 'Стабильно'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Активность рынка</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Среднее время продажи:</span>
                          <span className="font-medium">{analytics.economics.market_activity.average_sale_time} дней</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Уровень спроса:</span>
                          <Badge variant={analytics.economics.market_activity.demand_level === 'high' ? 'default' : 'secondary'}>
                            {analytics.economics.market_activity.demand_level === 'high' ? 'Высокий' :
                             analytics.economics.market_activity.demand_level === 'medium' ? 'Средний' : 'Низкий'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Скорость продаж:</span>
                          <span className="font-medium">{analytics.economics.market_activity.sales_velocity} объектов/мес</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Прогноз спроса */}
                <Card>
                  <CardHeader>
                    <CardTitle>Прогноз спроса</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center">
                      <Badge variant={analytics.economics.demand_forecast === 'increasing' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                        {analytics.economics.demand_forecast === 'increasing' ? 'Растущий спрос' :
                         analytics.economics.demand_forecast === 'decreasing' ? 'Снижающийся спрос' : 'Стабильный спрос'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai-insights" className="space-y-4">
                {!enhancedAnalytics ? (
                  <Card>
                    <CardContent className="flex flex-col items-center space-y-4 py-8">
                      <Target className="h-12 w-12 text-blue-500" />
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">AI-анализ с экспертными инсайтами</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Получите расширенную аналитику с использованием искусственного интеллекта
                        </p>
                        <Button 
                          onClick={loadEnhancedAnalytics}
                          disabled={enhancedLoading}
                        >
                          {enhancedLoading ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Анализируем...
                            </>
                          ) : (
                            'Запустить AI-анализ'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Рекомендация */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Target className="h-5 w-5 mr-2" />
                          Инвестиционная рекомендация
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <Badge className={`text-lg px-4 py-2 ${getRecommendationColor(enhancedAnalytics.ai_insights.investment_recommendation)}`}>
                            {getRecommendationText(enhancedAnalytics.ai_insights.investment_recommendation)}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Уверенность</p>
                            <p className="text-2xl font-bold">{enhancedAnalytics.ai_insights.confidence_score}%</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{enhancedAnalytics.ai_insights.summary}</p>
                      </CardContent>
                    </Card>

                    {/* SWOT анализ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-green-600">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Сильные стороны
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {enhancedAnalytics.ai_insights.strengths.map((strength, index) => (
                              <li key={index} className="text-sm flex items-start">
                                <CheckCircle className="h-3 w-3 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-red-600">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Слабые стороны
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {enhancedAnalytics.ai_insights.weaknesses.map((weakness, index) => (
                              <li key={index} className="text-sm flex items-start">
                                <AlertTriangle className="h-3 w-3 mr-2 mt-1 text-red-500 flex-shrink-0" />
                                {weakness}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-blue-600">
                            <TrendingUp className="h-5 w-5 mr-2" />
                            Возможности
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {enhancedAnalytics.ai_insights.opportunities.map((opportunity, index) => (
                              <li key={index} className="text-sm flex items-start">
                                <TrendingUp className="h-3 w-3 mr-2 mt-1 text-blue-500 flex-shrink-0" />
                                {opportunity}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-orange-600">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            Угрозы
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1">
                            {enhancedAnalytics.ai_insights.threats.map((threat, index) => (
                              <li key={index} className="text-sm flex items-start">
                                <AlertTriangle className="h-3 w-3 mr-2 mt-1 text-orange-500 flex-shrink-0" />
                                {threat}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Экспертные инсайты от Perplexity */}
                    {enhancedAnalytics.perplexity_insights && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Экспертные инсайты</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Рыночные настроения</h4>
                            <p className="text-sm text-gray-700">{enhancedAnalytics.perplexity_insights.market_sentiment}</p>
                          </div>
                          
                          {enhancedAnalytics.perplexity_insights.development_projects.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Проекты развития</h4>
                              <ul className="space-y-1">
                                {enhancedAnalytics.perplexity_insights.development_projects.map((project, index) => (
                                  <li key={index} className="text-sm text-gray-700">• {project}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div>
                            <h4 className="font-semibold mb-2">Экспертное мнение</h4>
                            <p className="text-sm text-gray-700">{enhancedAnalytics.perplexity_insights.expert_opinion}</p>
                          </div>

                          {enhancedAnalytics.perplexity_insights.future_trends.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Тренды развития</h4>
                              <ul className="space-y-1">
                                {enhancedAnalytics.perplexity_insights.future_trends.map((trend, index) => (
                                  <li key={index} className="text-sm text-gray-700">• {trend}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}