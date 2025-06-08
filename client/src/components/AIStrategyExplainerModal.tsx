import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Home, 
  RotateCcw, 
  Shield, 
  AlertTriangle, 
  DollarSign,
  Clock,
  Target,
  ChevronRight,
  Lightbulb,
  BarChart3,
  PieChart,
  Calculator,
  Info
} from 'lucide-react';
import type { PropertyWithRelations } from '@/types';

interface AIStrategyExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyWithRelations;
  analytics: any;
}

interface StrategyExplanation {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string;
  expectedReturn: string;
  initialInvestment: string;
  monthlyCommitment: string;
  exitStrategy: string;
  marketConditions: string[];
  aiInsight: string;
}

export const AIStrategyExplainerModal: React.FC<AIStrategyExplainerModalProps> = ({
  isOpen,
  onClose,
  property,
  analytics
}) => {
  const [activeStrategy, setActiveStrategy] = useState<'rental' | 'flip' | 'hold'>('rental');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const getStrategyData = (): StrategyExplanation => {
    const basePrice = property.price || 0;
    const monthlyRental = analytics.rentalIncomeMonthly || 0;
    const flipProfit = analytics.flipPotentialProfit || 0;
    const renovationCost = analytics.renovationCostEstimate || 0;
    
    switch (activeStrategy) {
      case 'rental':
        return {
          title: 'Сдача в аренду',
          description: 'Получение стабильного пассивного дохода от сдачи недвижимости в долгосрочную аренду.',
          pros: [
            'Постоянный денежный поток',
            'Защита от инфляции',
            'Налоговые льготы',
            'Возможность использования кредитного плеча',
            'Долгосрочный рост стоимости активов'
          ],
          cons: [
            'Необходимость управления арендаторами',
            'Периоды простоя между арендаторами',
            'Расходы на содержание и ремонт',
            'Низкая ликвидность инвестиций',
            'Зависимость от местного рынка аренды'
          ],
          riskLevel: 'medium',
          timeframe: `${analytics.rentalPaybackYears || '20'} лет до окупаемости`,
          expectedReturn: `${analytics.rentalRoiAnnual || '5'}% годовых`,
          initialInvestment: `${basePrice.toLocaleString('ru-RU')} ₽`,
          monthlyCommitment: `${Math.round(basePrice * 0.005).toLocaleString('ru-RU')} ₽ (обслуживание)`,
          exitStrategy: 'Продажа недвижимости после роста стоимости или изменения жизненных обстоятельств',
          marketConditions: [
            'Стабильный спрос на аренду в районе',
            'Развитая инфраструктура',
            'Рост населения региона',
            'Экономическая стабильность'
          ],
          aiInsight: `ИИ анализ: Данный объект показывает ${analytics.rentalRoiAnnual || '5'}% годовой доходности от аренды. Учитывая местоположение и характеристики объекта, прогнозируется стабильный спрос на аренду. Рекомендуется как основная стратегия для консервативных инвесторов.`
        };
        
      case 'flip':
        return {
          title: 'Флиппинг (быстрая перепродажа)',
          description: 'Покупка недвижимости с целью улучшения и быстрой перепродажи с прибылью.',
          pros: [
            'Быстрая прибыль (6-12 месяцев)',
            'Высокая потенциальная доходность',
            'Развитие навыков ремонта и дизайна',
            'Возможность работы с несколькими проектами',
            'Независимость от рынка аренды'
          ],
          cons: [
            'Высокие риски и неопределенность',
            'Значительные первоначальные вложения',
            'Необходимость экспертизы в ремонте',
            'Зависимость от рыночных условий',
            'Налоги с краткосрочной прибыли'
          ],
          riskLevel: 'high',
          timeframe: `${analytics.flipTimeframeMonths || '8'} месяцев`,
          expectedReturn: `${analytics.flipRoi || '0'}% за проект`,
          initialInvestment: `${(basePrice + renovationCost).toLocaleString('ru-RU')} ₽`,
          monthlyCommitment: `${Math.round(renovationCost / 6).toLocaleString('ru-RU')} ₽ (ремонт)`,
          exitStrategy: 'Продажа после завершения ремонта и роста рыночной стоимости',
          marketConditions: [
            'Растущий рынок недвижимости',
            'Доступность качественных подрядчиков',
            'Спрос на обновленное жилье',
            'Стабильные цены на материалы'
          ],
          aiInsight: `ИИ анализ: Флиппинг данного объекта может принести ${Math.abs(flipProfit).toLocaleString('ru-RU')} ₽ ${flipProfit > 0 ? 'прибыли' : 'убытка'}. ${flipProfit > 0 ? 'Проект выглядит перспективным' : 'Высокие риски убытков'} при инвестициях в ремонт ${renovationCost.toLocaleString('ru-RU')} ₽. Рекомендуется только опытным инвесторам.`
        };
        
      case 'hold':
        return {
          title: 'Долгосрочное владение (HODL)',
          description: 'Покупка и удержание недвижимости для долгосрочного роста капитала и защиты от инфляции.',
          pros: [
            'Защита от инфляции',
            'Долгосрочный рост капитала',
            'Минимальные операционные расходы',
            'Психологическая простота стратегии',
            'Возможность передачи наследникам'
          ],
          cons: [
            'Отсутствие текущего дохода',
            'Длительная неликвидность',
            'Налоги на недвижимость',
            'Риски локального рынка',
            'Упущенные альтернативные возможности'
          ],
          riskLevel: 'low',
          timeframe: '10+ лет',
          expectedReturn: `${analytics.priceForecast3y || '8'}% рост за 3 года`,
          initialInvestment: `${basePrice.toLocaleString('ru-RU')} ₽`,
          monthlyCommitment: `${Math.round(basePrice * 0.001).toLocaleString('ru-RU')} ₽ (налоги и обслуживание)`,
          exitStrategy: 'Продажа при достижении целевой стоимости или изменении жизненных планов',
          marketConditions: [
            'Долгосрочный экономический рост',
            'Развитие района и инфраструктуры',
            'Ограниченное предложение земли',
            'Рост населения и доходов'
          ],
          aiInsight: `ИИ анализ: Объект имеет индекс безопасности ${analytics.safeHavenScore || '5'}/10 для долгосрочного владения. Прогнозируется рост стоимости на ${analytics.priceForecast3y || '8'}% за 3 года. Подходит для консервативных инвесторов, ищущих защиту капитала от инфляции.`
        };
    }
  };

  const strategyData = getStrategyData();

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <Shield className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'rental': return <Home className="w-5 h-5" />;
      case 'flip': return <RotateCcw className="w-5 h-5" />;
      case 'hold': return <Shield className="w-5 h-5" />;
      default: return <TrendingUp className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Brain className="w-6 h-6 mr-2 text-blue-600" />
            ИИ-объяснение инвестиционных стратегий
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{property.title}</h3>
                  <p className="text-gray-600">{property.address}</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">
                    {property.price.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  {analytics.investmentRating || 'Анализ'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Strategy Selector */}
          <Tabs value={activeStrategy} onValueChange={(value) => setActiveStrategy(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rental" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Аренда
              </TabsTrigger>
              <TabsTrigger value="flip" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Флиппинг
              </TabsTrigger>
              <TabsTrigger value="hold" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Долгосрочно
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeStrategy} className="space-y-6 mt-6">
              {/* Strategy Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {getStrategyIcon(activeStrategy)}
                    {strategyData.title}
                    <Badge className={getRiskColor(strategyData.riskLevel)}>
                      {getRiskIcon(strategyData.riskLevel)}
                      {strategyData.riskLevel === 'low' ? 'Низкий риск' : 
                       strategyData.riskLevel === 'medium' ? 'Средний риск' : 'Высокий риск'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{strategyData.description}</p>
                  
                  {/* AI Insight */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-800 mb-2">ИИ-анализ стратегии</h4>
                          <p className="text-blue-700">{strategyData.aiInsight}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm text-gray-600">Срок</div>
                    <div className="font-semibold">{strategyData.timeframe}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-sm text-gray-600">Доходность</div>
                    <div className="font-semibold">{strategyData.expectedReturn}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-sm text-gray-600">Инвестиции</div>
                    <div className="font-semibold">{strategyData.initialInvestment}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Calculator className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <div className="text-sm text-gray-600">Ежемесячно</div>
                    <div className="font-semibold">{strategyData.monthlyCommitment}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Pros and Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Преимущества
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {strategyData.pros.map((pro, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Недостатки
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {strategyData.cons.map((con, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Market Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Благоприятные рыночные условия
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {strategyData.marketConditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{condition}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Exit Strategy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-purple-600" />
                    Стратегия выхода
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{strategyData.exitStrategy}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
            <div className="flex gap-2">
              <Button variant="outline">
                <Lightbulb className="w-4 h-4 mr-2" />
                Получить рекомендации ИИ
              </Button>
              <Button>
                <Calculator className="w-4 h-4 mr-2" />
                Рассчитать детально
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};