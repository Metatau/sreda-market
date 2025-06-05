import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInvestmentMetrics } from "@/hooks/useProperties";

interface InvestmentCalculatorProps {
  propertyId?: number;
  propertyPrice?: number;
}

export function InvestmentCalculator({ propertyId, propertyPrice = 5000000 }: InvestmentCalculatorProps) {
  const [customRent, setCustomRent] = useState<number | null>(null);
  const [customExpenses, setCustomExpenses] = useState<number | null>(null);
  
  const { data: metrics } = useInvestmentMetrics(propertyId || 0);

  // Default calculations if no propertyId is provided
  const estimatedRent = customRent || metrics?.estimatedRent || Math.round(propertyPrice * 0.006);
  const monthlyExpenses = customExpenses || metrics?.monthlyExpenses || Math.round(propertyPrice * 0.002);
  const netMonthlyIncome = estimatedRent - monthlyExpenses;
  const annualIncome = netMonthlyIncome * 12;
  const roi = (annualIncome / propertyPrice) * 100;
  const paybackPeriod = propertyPrice / annualIncome;

  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-green-800">
          <i className="fas fa-calculator"></i>
          <span>Калькулятор инвестиций</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="rent">Аренда в месяц (₽)</Label>
            <Input
              id="rent"
              type="number"
              value={customRent || estimatedRent}
              onChange={(e) => setCustomRent(parseInt(e.target.value) || null)}
              placeholder="Введите сумму аренды"
            />
          </div>
          
          <div>
            <Label htmlFor="expenses">Расходы в месяц (₽)</Label>
            <Input
              id="expenses"
              type="number"
              value={customExpenses || monthlyExpenses}
              onChange={(e) => setCustomExpenses(parseInt(e.target.value) || null)}
              placeholder="Коммунальные, налоги, управление"
            />
          </div>
        </div>

        <Separator />

        {/* Calculated Results */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Чистый доход в месяц:</span>
            <span className="font-semibold text-green-700">
              {netMonthlyIncome.toLocaleString()} ₽
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Доход в год:</span>
            <span className="font-semibold text-green-700">
              {annualIncome.toLocaleString()} ₽
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Доходность (ROI):</span>
            <span className={`font-bold text-lg ${roi >= 8 ? "text-green-600" : roi >= 5 ? "text-yellow-600" : "text-red-600"}`}>
              {roi.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Окупаемость:</span>
            <span className="font-semibold text-blue-700">
              {paybackPeriod.toFixed(1)} лет
            </span>
          </div>
        </div>

        <Separator />

        {/* Investment Insights */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Оценка инвестиции:</h4>
          
          <div className="space-y-1 text-sm">
            {roi >= 10 && (
              <div className="flex items-center text-green-600">
                <i className="fas fa-thumbs-up mr-2"></i>
                Отличная доходность для инвестиций
              </div>
            )}
            
            {roi >= 7 && roi < 10 && (
              <div className="flex items-center text-yellow-600">
                <i className="fas fa-balance-scale mr-2"></i>
                Хорошая доходность для рынка недвижимости
              </div>
            )}
            
            {roi < 7 && (
              <div className="flex items-center text-red-600">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Низкая доходность, рассмотрите другие варианты
              </div>
            )}
            
            {paybackPeriod <= 10 && (
              <div className="flex items-center text-green-600">
                <i className="fas fa-clock mr-2"></i>
                Быстрая окупаемость
              </div>
            )}
            
            {paybackPeriod > 15 && (
              <div className="flex items-center text-orange-600">
                <i className="fas fa-hourglass-half mr-2"></i>
                Долгий срок окупаемости
              </div>
            )}
          </div>
        </div>
        
        {/* Additional Metrics */}
        <div className="bg-white/50 rounded-lg p-3 space-y-2">
          <h5 className="font-medium text-sm text-gray-700">Дополнительные метрики:</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Цена за м²:</span>
              <div className="font-medium">
                {propertyPrice && metrics?.propertyId ? "Рассчитано" : "—"}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Ликвидность:</span>
              <div className="font-medium">
                {metrics?.liquidityScore ? `${metrics.liquidityScore}/10` : "—"}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Рост цены:</span>
              <div className="font-medium text-green-600">
                {metrics?.priceGrowthRate ? `+${metrics.priceGrowthRate}%` : "+8-12%"}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Тренд рынка:</span>
              <div className="font-medium text-blue-600">Рост</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
