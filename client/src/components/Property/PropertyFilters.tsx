import React from "react";
import { useRegions, usePropertyClasses } from "@/hooks/useProperties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAISearch } from "@/hooks/useProperties";
import { useToast } from "@/hooks/use-toast";
import type { PropertyFilters } from "@/types";

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
}

export function PropertyFilters({ filters, onFiltersChange }: PropertyFiltersProps) {
  const { data: regions = [] } = useRegions();
  const { data: propertyClasses = [] } = usePropertyClasses();
  const aiSearchMutation = useAISearch();
  const { toast } = useToast();

  const [aiQuery, setAiQuery] = React.useState("");

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;

    try {
      const result = await aiSearchMutation.mutateAsync(aiQuery);
      
      // Apply AI-recommended filters
      onFiltersChange(result.filters);
      
      toast({
        title: "ИИ-поиск выполнен",
        description: result.recommendations.reasoning,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить ИИ-поиск",
        variant: "destructive",
      });
    }
  };

  const getPropertyClassColor = (className: string) => {
    const colors = {
      "Эконом": "bg-blue-100 text-blue-700 border-blue-300",
      "Стандарт": "bg-green-100 text-green-700 border-green-300",
      "Комфорт": "bg-yellow-100 text-yellow-700 border-yellow-300",
      "Бизнес": "bg-purple-100 text-purple-700 border-purple-300",
      "Элит": "bg-orange-100 text-orange-700 border-orange-300",
    };
    return colors[className as keyof typeof colors] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Фильтры поиска</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Очистить
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Region Filter */}
        <div className="space-y-2">
          <Label>Регион</Label>
          <Select
            value={filters.regionId?.toString() || "all"}
            onValueChange={(value) => handleFilterChange("regionId", value === "all" ? undefined : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Все регионы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все регионы</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id.toString()}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Property Class Filter */}
        <div className="space-y-3">
          <Label>Класс недвижимости</Label>
          <div className="space-y-2">
            {propertyClasses.map((propertyClass) => (
              <Button
                key={propertyClass.id}
                variant="outline"
                className={`w-full justify-between h-auto p-3 ${
                  filters.propertyClassId === propertyClass.id
                    ? getPropertyClassColor(propertyClass.name)
                    : "hover:bg-gray-50"
                }`}
                onClick={() =>
                  handleFilterChange(
                    "propertyClassId",
                    filters.propertyClassId === propertyClass.id ? undefined : propertyClass.id
                  )
                }
              >
                <span className="font-medium">{propertyClass.name}</span>
                <span className="text-xs text-gray-500">
                  {propertyClass.minPricePerSqm.toLocaleString()}-
                  {propertyClass.maxPricePerSqm === 999999999 
                    ? "∞" 
                    : propertyClass.maxPricePerSqm.toLocaleString()
                  } ₽/м²
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <Label>Цена</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                placeholder="от ₽"
                value={filters.minPrice || ""}
                onChange={(e) => handleFilterChange("minPrice", e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="до ₽"
                value={filters.maxPrice || ""}
                onChange={(e) => handleFilterChange("maxPrice", e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>
        </div>

        {/* Rooms */}
        <div className="space-y-3">
          <Label>Количество комнат</Label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((rooms) => (
              <Button
                key={rooms}
                variant={filters.rooms === rooms ? "default" : "outline"}
                size="sm"
                className="aspect-square"
                onClick={() => handleFilterChange("rooms", filters.rooms === rooms ? undefined : rooms)}
              >
                {rooms === 5 ? "5+" : rooms}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Search */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <i className="fas fa-robot text-blue-600"></i>
              <Label className="font-medium">ИИ-поиск</Label>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Опишите, что вы ищете
            </p>
            <Textarea
              placeholder="Например: 'Ищу квартиру для инвестиций с хорошей доходностью в центре Москвы'"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="mb-3 resize-none"
              rows={3}
            />
            <Button
              onClick={handleAISearch}
              disabled={aiSearchMutation.isPending || !aiQuery.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {aiSearchMutation.isPending ? (
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
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
