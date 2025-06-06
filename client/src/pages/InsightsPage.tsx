import React from 'react';
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Eye, Brain } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Brain className="w-12 h-12 text-primary mr-3" />
              <h1 className="text-4xl font-bold text-gray-900">Инсайты</h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Аналитические данные и прогнозы рынка недвижимости
            </p>
          </div>

          {/* Placeholder Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Рыночная аналитика
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Глубокий анализ трендов и динамики рынка недвижимости
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Прогнозы цен
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Машинное обучение для прогнозирования стоимости объектов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Eye className="w-5 h-5 mr-2 text-purple-600" />
                  Обзоры районов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Детальные отчеты по инвестиционной привлекательности районов
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon Message */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Скоро здесь появится детальная аналитика
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Мы работаем над созданием мощной аналитической платформы, 
                которая поможет вам принимать обоснованные инвестиционные решения 
                на основе данных и машинного обучения.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}