import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Home, 
  RotateCcw, 
  Shield, 
  DollarSign,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  Activity,
  MapPin,
  Building,
  Layers,
  Phone,
  ExternalLink,
  ImageIcon
} from "lucide-react";

interface Property {
  id: number;
  title: string;
  address: string;
  price: number;
  pricePerSqm?: number;
  area?: string;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  propertyType?: string;
  district?: string;
  metroStation?: string;
  url?: string;
  phone?: string;
  source?: string;
  imageUrl?: string;
  region?: {
    id: number;
    name: string;
  };
  propertyClass?: {
    id: number;
    name: string;
  };
}

interface InvestmentAnalytics {
  id?: number;
  propertyId?: number;
  priceChange1y?: string;
  priceChange3m?: string;
  priceVolatility?: string;
  rentalYield?: string;
  rentalIncomeMonthly?: number;
  rentalRoiAnnual?: string;
  rentalPaybackYears?: string;
  flipPotentialProfit?: number;
  flipRoi?: string;
  flipTimeframeMonths?: number;
  renovationCostEstimate?: number;
  safeHavenScore?: number;
  capitalPreservationIndex?: string;
  liquidityScore?: number;
  priceForecast3y?: string;
  infrastructureImpactScore?: string;
  developmentRiskScore?: string;
  investmentRating?: string;
  riskLevel?: string;
  recommendedStrategy?: string;
  calculatedAt?: string;
  expiresAt?: string;
}

interface InvestmentAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  analytics: InvestmentAnalytics;
}

export const InvestmentAnalyticsModal: React.FC<InvestmentAnalyticsModalProps> = ({
  isOpen,
  onClose,
  property,
  analytics
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const getRatingColor = (rating: string) => {
    const colors = {
      'A+': 'bg-green-600 text-white',
      'A': 'bg-green-500 text-white',
      'B+': 'bg-blue-600 text-white',
      'B': 'bg-blue-500 text-white',
      'C+': 'bg-orange-600 text-white',
      'C': 'bg-red-600 text-white'
    };
    return colors[rating as keyof typeof colors] || 'bg-gray-600 text-white';
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'rental': return <Home className="w-5 h-5" />;
      case 'flip': return <RotateCcw className="w-5 h-5" />;
      case 'hold': return <Shield className="w-5 h-5" />;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getStrategyName = (strategy: string) => {
    switch (strategy) {
      case 'rental': return 'Аренда';
      case 'flip': return 'Флиппинг';
      case 'hold': return 'Долгосрочное владение';
      default: return 'Анализ';
    }
  };

  const getRatingDescription = (rating: string) => {
    switch (rating) {
      case 'A+': return 'Превосходные инвестиционные перспективы. Высокая доходность, низкие риски, отличная ликвидность.';
      case 'A': return 'Отличные инвестиционные возможности. Хорошая доходность и стабильные перспективы роста.';
      case 'B+': return 'Хорошие инвестиционные характеристики. Приемлемая доходность, сбалансированные риски.';
      case 'B': return 'Удовлетворительные показатели. Средняя доходность, умеренные риски.';
      case 'C+': return 'Ниже средних показателей. Низкая доходность, повышенные риски.';
      case 'C': return 'Слабые инвестиционные перспективы. Очень низкая доходность или убыточность, высокие риски.';
      default: return 'Рейтинг не определен. Требуется дополнительный анализ.';
    }
  };

  const ScenarioComparison = () => {
    const scenarios = [
      {
        name: 'Аренда',
        icon: <Home className="w-6 h-6" />,
        roi: analytics.rentalRoiAnnual || '0',
        timeframe: analytics.rentalPaybackYears ? `${analytics.rentalPaybackYears} лет` : 'N/A',
        income: analytics.rentalIncomeMonthly ? `${analytics.rentalIncomeMonthly.toLocaleString('ru-RU')} ₽/мес` : 'N/A',
        description: 'Стабильный пассивный доход',
        color: 'green'
      },
      {
        name: 'Флиппинг',
        icon: <RotateCcw className="w-6 h-6" />,
        roi: analytics.flipRoi || '0',
        timeframe: analytics.flipTimeframeMonths ? `${analytics.flipTimeframeMonths} мес` : 'N/A',
        income: analytics.flipPotentialProfit ? `${analytics.flipPotentialProfit.toLocaleString('ru-RU')} ₽` : 'N/A',
        description: 'Быстрая прибыль после ремонта',
        color: 'blue'
      },
      {
        name: 'Тихая гавань',
        icon: <Shield className="w-6 h-6" />,
        roi: analytics.capitalPreservationIndex || '0',
        timeframe: '3+ лет',
        income: 'Сохранение капитала',
        description: 'Защита от инфляции',
        color: 'purple'
      }
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center">
          <PieChart className="w-5 h-5 mr-2" />
          Сравнение инвестиционных сценариев
        </h3>
        <div className="grid gap-4">
          {scenarios.map((scenario) => (
            <Card key={scenario.name} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${scenario.color}-100 text-${scenario.color}-600`}>
                    {scenario.icon}
                  </div>
                  <h4 className="font-medium text-lg">{scenario.name}</h4>
                </div>
                <span className={`text-2xl font-bold ${
                  parseFloat(scenario.roi) > 10 ? 'text-green-600' :
                  parseFloat(scenario.roi) > 5 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {scenario.roi}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Срок:</span>
                  <div className="font-medium">{scenario.timeframe}</div>
                </div>
                <div>
                  <span className="text-gray-600">Доход:</span>
                  <div className="font-medium">{scenario.income}</div>
                </div>
                <div>
                  <span className="text-gray-600">Тип:</span>
                  <div className="font-medium text-xs">{scenario.description}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const PriceAnalysis = () => {
    const priceChange1y = parseFloat(analytics.priceChange1y || '0');
    const priceChange3m = parseFloat(analytics.priceChange3m || '0');
    const volatility = parseFloat(analytics.priceVolatility || '0');
    const forecast3y = parseFloat(analytics.priceForecast3y || '0');

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Динамика и прогноз цен
        </h3>
        
        {/* Ключевые показатели */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {priceChange1y >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="text-sm text-gray-600">За год</div>
            <div className={`text-lg font-semibold ${priceChange1y >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange1y > 0 ? '+' : ''}{priceChange1y}%
            </div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              {priceChange3m >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="text-sm text-gray-600">За 3 месяца</div>
            <div className={`text-lg font-semibold ${priceChange3m >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange3m > 0 ? '+' : ''}{priceChange3m}%
            </div>
          </Card>
          
          <Card className="p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-2 text-orange-600" />
            <div className="text-sm text-gray-600">Волатильность</div>
            <div className="text-lg font-semibold text-orange-600">{volatility}%</div>
          </Card>
          
          <Card className="p-4 text-center">
            <Target className="w-5 h-5 mx-auto mb-2 text-purple-600" />
            <div className="text-sm text-gray-600">Прогноз 3 года</div>
            <div className="text-lg font-semibold text-purple-600">+{forecast3y}%</div>
          </Card>
        </div>

        {/* Прогресс-бары для наглядности */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Рост за год</span>
              <span>{priceChange1y}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, priceChange1y + 50))} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Прогноз роста (3 года)</span>
              <span>+{forecast3y}%</span>
            </div>
            <Progress value={Math.min(100, forecast3y)} className="h-2" />
          </div>
        </div>
      </div>
    );
  };

  const LocationAnalysis = () => {
    const infrastructureImpact = parseFloat(analytics.infrastructureImpactScore || '0') * 100;
    const developmentRisk = parseFloat(analytics.developmentRiskScore || '0') * 100;
    const liquidityScore = analytics.liquidityScore || 0;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Анализ локации и инфраструктуры</h3>
        
        {/* Инфраструктурные факторы */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h4 className="font-medium mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
              Влияние инфраструктуры
            </h4>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              +{infrastructureImpact.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Ожидаемый рост стоимости от развития инфраструктуры
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="font-medium mb-2 flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-orange-600" />
              Риск застройки
            </h4>
            <div className="text-2xl font-bold text-orange-600 mb-1">
              -{developmentRisk.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Потенциальное снижение из-за новой застройки
            </div>
          </Card>
        </div>

        {/* Оценка ликвидности */}
        <Card className="p-4">
          <h4 className="font-medium mb-3">Оценка ликвидности</h4>
          <div className="flex items-center space-x-4 mb-2">
            <div className="text-2xl font-semibold">{liquidityScore}/10</div>
            <div className="flex-1">
              <Progress value={liquidityScore * 10} className="h-3" />
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Скорость продажи объекта на вторичном рынке
          </div>
        </Card>
      </div>
    );
  };

  const CostBreakdown = () => {
    const monthlyRental = analytics.rentalIncomeMonthly || 0;
    const renovationCost = analytics.renovationCostEstimate || 0;
    
    // Примерные расходы для аренды (можно получать из API)
    const estimatedCosts = {
      tax: Math.round(property.price * 0.001), // 0.1% налог
      maintenance: Math.round((property.area ? parseFloat(property.area) : 50) * 1000), // 1000₽/м² в год
      utilities: Math.round((property.area ? parseFloat(property.area) : 50) * 2000 * 12), // 2000₽/м² в месяц
      management: Math.round(monthlyRental * 12 * 0.08), // 8% от аренды
      insurance: Math.round((property.area ? parseFloat(property.area) : 50) * 100), // 100₽/м² в год
    };

    const totalCosts = Object.values(estimatedCosts).reduce((sum, cost) => sum + cost, 0);
    const netIncome = (monthlyRental * 12) - totalCosts;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          Детализация расходов
        </h3>
        
        {/* Расходы на аренду */}
        <Card className="p-4">
          <h4 className="font-medium mb-4">Ежегодные расходы при сдаче в аренду</h4>
          <div className="space-y-3">
            {[
              { name: 'Налог на имущество', value: estimatedCosts.tax },
              { name: 'Содержание и ремонт', value: estimatedCosts.maintenance },
              { name: 'Коммунальные платежи', value: estimatedCosts.utilities },
              { name: 'Управление', value: estimatedCosts.management },
              { name: 'Страхование', value: estimatedCosts.insurance }
            ].map((cost, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <span className="text-gray-700">{cost.name}</span>
                <span className="font-medium">{cost.value.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-lg">Чистый доход:</span>
              <span className={`text-lg font-bold ${netIncome > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netIncome.toLocaleString('ru-RU')} ₽/год
              </span>
            </div>
          </div>
        </Card>

        {/* Расходы на флиппинг */}
        {renovationCost > 0 && (
          <Card className="p-4">
            <h4 className="font-medium mb-4">Расходы на флиппинг</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Ремонт и улучшения</span>
                <span className="font-medium">{renovationCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Риелторские услуги (3%)</span>
                <span className="font-medium">{Math.round(property.price * 0.03).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Налоги и сборы (3%)</span>
                <span className="font-medium">{Math.round(property.price * 0.03).toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-lg">Общие затраты:</span>
                <span className="text-lg font-bold text-blue-600">
                  {(renovationCost + property.price * 0.06).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const PropertyDetails = () => {
    const getPropertyTypeName = (type: string) => {
      const types = {
        'apartment': 'Квартира',
        'house': 'Дом',
        'townhouse': 'Таунхаус',
        'studio': 'Студия',
        'loft': 'Лофт',
        'penthouse': 'Пентхаус'
      };
      return types[type as keyof typeof types] || type;
    };

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Building className="w-5 h-5 mr-2" />
          Информация об объекте
        </h3>
        
        {/* Основная информация */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <h4 className="font-medium mb-4 flex items-center">
              <Home className="w-4 h-4 mr-2" />
              Основные характеристики
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Стоимость:</span>
                <span className="font-semibold text-lg text-green-600">
                  {property.price.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              {property.pricePerSqm && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Цена за м²:</span>
                  <span className="font-medium">
                    {property.pricePerSqm.toLocaleString('ru-RU')} ₽/м²
                  </span>
                </div>
              )}
              {property.area && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Площадь:</span>
                  <span className="font-medium">{property.area} м²</span>
                </div>
              )}
              {property.rooms && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Комнат:</span>
                  <span className="font-medium">{property.rooms}</span>
                </div>
              )}
              {property.floor && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Этаж:</span>
                  <span className="font-medium">
                    {property.floor}{property.totalFloors ? ` из ${property.totalFloors}` : ''}
                  </span>
                </div>
              )}
              {property.propertyType && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Тип:</span>
                  <span className="font-medium">
                    {getPropertyTypeName(property.propertyType)}
                  </span>
                </div>
              )}
              {property.propertyClass && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Класс:</span>
                  <Badge variant="outline" className="font-medium">
                    {property.propertyClass.name}
                  </Badge>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-4 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Расположение
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 block text-sm">Адрес:</span>
                <span className="font-medium">{property.address}</span>
              </div>
              {property.district && (
                <div>
                  <span className="text-gray-600 block text-sm">Район:</span>
                  <span className="font-medium">{property.district}</span>
                </div>
              )}
              {property.metroStation && (
                <div>
                  <span className="text-gray-600 block text-sm">Станция метро:</span>
                  <span className="font-medium">{property.metroStation}</span>
                </div>
              )}
              {property.region && (
                <div>
                  <span className="text-gray-600 block text-sm">Регион:</span>
                  <span className="font-medium">{property.region.name}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Ссылка на объявление */}
        <Card className="p-4">
          <h4 className="font-medium mb-4 flex items-center">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ссылка на объявление
          </h4>
          <div className="space-y-3">
            {/* Источник объявления */}
            <div className="flex items-center space-x-2">
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Источник:</span>
              <span className="font-medium text-blue-600">{property.source || 'ads-api.ru'}</span>
            </div>
            
            {property.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <a 
                  href={`tel:${property.phone}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {property.phone}
                </a>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <ExternalLink className="w-4 h-4 text-gray-500" />
              {property.url ? (
                <a 
                  href={property.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Открыть объявление на ads-api.ru
                </a>
              ) : (
                <a 
                  href="https://ads-api.ru/main"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Перейти на ads-api.ru
                </a>
              )}
            </div>
          </div>
        </Card>


      </div>
    );
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="investment-analytics-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Инвестиционная аналитика
            </DialogTitle>
            <div id="investment-analytics-description" className="text-sm text-gray-600">
              Детальный анализ инвестиционной привлекательности объекта: {property.address}
            </div>
          </DialogHeader>

          {/* Основные метрики в шапке */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics.rentalYield || '0'}%
              </div>
              <div className="text-xs text-gray-600">Доходность аренды</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.flipRoi || '0'}%
              </div>
              <div className="text-xs text-gray-600">ROI флиппинга</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                +{analytics.priceForecast3y || '0'}%
              </div>
              <div className="text-xs text-gray-600">Прогноз 3 года</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              {analytics.investmentRating && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={`text-2xl font-bold px-3 py-1 cursor-help ${getRatingColor(analytics.investmentRating)}`}>
                      {analytics.investmentRating}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-2">
                      <div className="font-semibold">Рейтинг {analytics.investmentRating}</div>
                      <div className="text-sm">{getRatingDescription(analytics.investmentRating)}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        Рассчитывается на основе доходности аренды, ROI флиппинга и безопасности инвестиций
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="text-xs text-gray-600 mt-1">Рейтинг</div>
            </div>
          </div>

        {/* Табы с детальной информацией */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="dynamics">Динамика</TabsTrigger>
            <TabsTrigger value="location">Локация</TabsTrigger>
            <TabsTrigger value="costs">Расходы</TabsTrigger>
            <TabsTrigger value="details">Объект</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ScenarioComparison />
          </TabsContent>

          <TabsContent value="dynamics" className="mt-6">
            <PriceAnalysis />
          </TabsContent>

          <TabsContent value="location" className="mt-6">
            <LocationAnalysis />
          </TabsContent>

          <TabsContent value="costs" className="mt-6">
            <CostBreakdown />
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <PropertyDetails />
          </TabsContent>
        </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};