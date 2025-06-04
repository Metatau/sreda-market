import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRegions, usePropertyClasses } from "@/hooks/useProperties";
import { chatApi } from "@/services/api";
import type { SearchFilters } from "@/types";

interface PropertyFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const propertyClassColors = {
  1: "border-blue-500 bg-blue-50 text-blue-700", // Эконом
  2: "border-emerald-500 bg-emerald-50 text-emerald-700", // Стандарт
  3: "border-amber-500 bg-amber-50 text-amber-700", // Комфорт
  4: "border-purple-500 bg-purple-50 text-purple-700", // Бизнес
  5: "border-orange-500 bg-orange-50 text-orange-700", // Элит
};

export function PropertyFilters({ filters, onFiltersChange }: PropertyFiltersProps) {
  const [aiQuery, setAiQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const { data: regions = [] } = useRegions();
  const { data: propertyClasses = [] } = usePropertyClasses();

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    
    setIsAiLoading(true);
    try {
      const response = await chatApi.sendMessage(aiQuery);
      // This would typically parse the AI response and apply filters
      // For now, just clear the query
      setAiQuery("");
    } catch (error) {
      console.error("AI search error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedPropertyClass = propertyClasses.find(pc => pc.id === filters.propertyClassId);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Фильтры</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Очистить
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Region Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Регион</label>
          <Select value={filters.regionId?.toString() || ""} onValueChange={(value) => handleFilterChange('regionId', value ? parseInt(value) : null)}>
            <SelectTrigger>
              <SelectValue placeholder="Все регионы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все регионы</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id.toString()}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Property Class Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Класс недвижимости</label>
          <div className="space-y-2">
            {propertyClasses.map((propertyClass) => {
              const isSelected = filters.propertyClassId === propertyClass.id;
              const colorClass = propertyClassColors[propertyClass.id as keyof typeof propertyClassColors] || "border-gray-200 hover:border-gray-300";
              
              return (
                <Button
                  key={propertyClass.id}
                  variant="outline"
                  className={`w-full justify-between p-3 h-auto ${isSelected ? colorClass : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => handleFilterChange('propertyClassId', isSelected ? null : propertyClass.id)}
                >
                  <span className="font-medium">{propertyClass.name}</span>
                  <span className="text-xs">
                    {propertyClass.minPricePerSqm.toLocaleString()}-{propertyClass.maxPricePerSqm.toLocaleString()} ₽/м²
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Цена</label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="от ₽"
              value={filters.minPrice || ''}
              onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseInt(e.target.value) : null)}
            />
            <Input
              type="number"
              placeholder="до ₽"
              value={filters.maxPrice || ''}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>
        </div>

        {/* Rooms Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Комнат</label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((rooms) => {
              const isSelected = filters.rooms === rooms;
              return (
                <Button
                  key={rooms}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="aspect-square"
                  onClick={() => handleFilterChange('rooms', isSelected ? null : rooms)}
                >
                  {rooms === 5 ? '5+' : rooms}
                </Button>
              );
            })}
          </div>
        </div>

        {/* AI Search */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <i className="fas fa-robot text-blue-600"></i>
            <h4 className="font-medium text-gray-900">ИИ-поиск</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">Опишите, что вы ищете</p>
          <Textarea
            placeholder="Например: 'Ищу квартиру для инвестиций с хорошей доходностью в центре Москвы'"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            className="mb-3 resize-none"
            rows={3}
          />
          <Button 
            onClick={handleAiSearch}
            disabled={!aiQuery.trim() || isAiLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isAiLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Поиск...
              </>
            ) : (
              <>
                <i className="fas fa-search mr-2"></i>
                Найти с ИИ
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
