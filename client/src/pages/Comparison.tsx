
import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, X, Plus, MapPin, Bed, Square, Calculator } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Property } from '@/types';

const getPropertyClassColor = (className: string) => {
  const colors = {
    "Эконом": "bg-blue-100 text-blue-700 border-blue-200",
    "Стандарт": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Комфорт": "bg-amber-100 text-amber-700 border-amber-200",
    "Бизнес": "bg-purple-100 text-purple-700 border-purple-200",
    "Элит": "bg-orange-100 text-orange-700 border-orange-200",
  };
  return colors[className as keyof typeof colors] || colors["Стандарт"];
};

export function Comparison() {
  const { isAuthenticated } = useAuth();
  const [compareList, setCompareList] = useState<Property[]>([]);

  // В реальном приложении здесь бы загружались объекты для сравнения из API
  const handleRemoveFromComparison = (propertyId: number) => {
    setCompareList(prev => prev.filter(p => p.id !== propertyId));
  };

  const handleClearAll = () => {
    setCompareList([]);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Войдите в аккаунт
              </h2>
              <p className="text-gray-600">
                Для использования функции сравнения необходимо войти в систему
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Scale className="h-8 w-8 text-blue-600" />
                Сравнение объектов
              </h1>
              <p className="text-gray-600 mt-2">
                {compareList.length} объектов для сравнения (максимум 4)
              </p>
            </div>
            
            {compareList.length > 0 && (
              <div className="flex items-center gap-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAll}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Очистить все
                </Button>
              </div>
            )}
          </div>
        </div>

        {compareList.length === 0 ? (
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              <Scale className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Список сравнения пуст
              </h2>
              <p className="text-gray-600 mb-6">
                Добавляйте объекты в сравнение для анализа их характеристик
              </p>
              <Button onClick={() => window.location.href = '/'}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить объекты
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Карточки объектов */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {compareList.map((property) => (
                <Card key={property.id} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => handleRemoveFromComparison(property.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg line-clamp-2">{property.title}</CardTitle>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(property.price)} ₽
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{property.address}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>{property.rooms} комн.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Square className="h-4 w-4" />
                        <span>{property.area} м²</span>
                      </div>
                    </div>
                    
                    {property.propertyClassId && (
                      <Badge className="bg-blue-500 font-medium border">
                        Класс {property.propertyClassId}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Таблица сравнения */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Подробное сравнение
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Характеристика</TableHead>
                        {compareList.map((property) => (
                          <TableHead key={property.id} className="text-center">
                            {property.title.substring(0, 30)}...
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Цена</TableCell>
                        {compareList.map((property) => (
                          <TableCell key={property.id} className="text-center font-semibold text-green-600">
                            {formatPrice(property.price)} ₽
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Цена за м²</TableCell>
                        {compareList.map((property) => (
                          <TableCell key={property.id} className="text-center">
                            {property.pricePerSqm ? formatPrice(property.pricePerSqm) : 'N/A'} ₽/м²
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Площадь</TableCell>
                        {compareList.map((property) => (
                          <TableCell key={property.id} className="text-center">
                            {property.area} м²
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Комнаты</TableCell>
                        {compareList.map((property) => (
                          <TableCell key={property.id} className="text-center">
                            {property.rooms}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Этаж</TableCell>
                        {compareList.map((property) => (
                          <TableCell key={property.id} className="text-center">
                            {property.floor} из {property.totalFloors}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Класс недвижимости</TableCell>
                        {compareList.map((property) => (
                          <TableCell key={property.id} className="text-center">
                            {property.propertyClass?.name || 'N/A'}
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Регион</TableCell>
                        {compareList.map((property) => (
                          <TableCell key={property.id} className="text-center">
                            {property.region?.name || 'N/A'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
