import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegions, usePropertyClasses } from "@/hooks/useProperties";
import type { PropertyFilters } from "@/types";

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
}

const propertyClassColors = {
  1: "border-blue-500 bg-blue-50 text-blue-700", // Эконом
  2: "border-emerald-500 bg-emerald-50 text-emerald-700", // Стандарт
  3: "border-amber-500 bg-amber-50 text-amber-700", // Комфорт
  4: "border-purple-500 bg-purple-50 text-purple-700", // Бизнес
  5: "border-orange-500 bg-orange-50 text-orange-700", // Элит
};

export function PropertyFilters({ filters, onFiltersChange }: PropertyFiltersProps) {
  const { data: regions = [] } = useRegions();
  const { data: propertyClasses = [] } = usePropertyClasses();

  // Сортируем регионы по важности (крупные города и области первыми)
  const sortedRegions = [...regions].sort((a, b) => {
    const order = [
      'Москва', 'Московская область', 'Санкт-Петербург', 'Ленинградская область',
      'Новосибирск', 'Екатеринбург', 'Нижний Новгород', 'Казань',
      'Уфа', 'Красноярск', 'Пермь', 'Калининград'
    ];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined,
    };
    console.log('PropertyFilters - Filter change:', key, value);
    console.log('PropertyFilters - New filters:', newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">Фильтры</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 sm:px-3"
          >
            Очистить
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 sm:space-y-4 pt-0 p-3 sm:p-6">
        {/* City Filter */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Город</label>
          <Select value={filters.regionId?.toString() || "all"} onValueChange={(value) => handleFilterChange('regionId', value === "all" ? null : parseInt(value))}>
            <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Все города" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все города</SelectItem>
              {sortedRegions.map((region) => (
                <SelectItem key={region.id} value={region.id.toString()}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Market Type Filter */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Тип недвижимости</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <Button
              variant={filters.marketType === 'secondary' ? "default" : "outline"}
              onClick={() => handleFilterChange('marketType', filters.marketType === 'secondary' ? undefined : 'secondary')}
              className="h-8 sm:h-10 text-xs sm:text-sm"
            >
              Вторичка
            </Button>
            <Button
              variant={filters.marketType === 'new_construction' ? "default" : "outline"}
              onClick={() => handleFilterChange('marketType', filters.marketType === 'new_construction' ? undefined : 'new_construction')}
              className="h-8 sm:h-10 text-xs sm:text-sm"
            >
              Новостройки
            </Button>
          </div>
        </div>

        {/* Property Class Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Класс недвижимости</label>
          <Select 
            value={filters.propertyClassId?.toString() || "all"} 
            onValueChange={(value) => handleFilterChange('propertyClassId', value === "all" ? null : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Все классы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все классы</SelectItem>
              {propertyClasses.map((propertyClass) => (
                <SelectItem key={propertyClass.id} value={propertyClass.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{propertyClass.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {propertyClass.minPricePerSqm.toLocaleString()}-{propertyClass.maxPricePerSqm.toLocaleString()} ₽/м²
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </CardContent>
    </Card>
  );
}