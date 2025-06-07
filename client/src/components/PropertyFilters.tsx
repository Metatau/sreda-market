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

export function PropertyFilters({ filters, onFiltersChange }: PropertyFiltersProps) {
  const { data: regions = [] } = useRegions();
  const { data: propertyClasses = [] } = usePropertyClasses();

  // Определяем приоритетные российские города с их ID
  const priorityCities = [
    { id: 1, name: 'Москва' },
    { id: 2, name: 'Санкт-Петербург' },
    { id: 3, name: 'Новосибирск' },
    { id: 4, name: 'Екатеринбург' },
    { id: 5, name: 'Казань' },
    { id: 11, name: 'Уфа' },
    { id: 12, name: 'Красноярск' },
    { id: 13, name: 'Пермь' },
    { id: 35, name: 'Калининград' },
    { id: 36, name: 'Тюмень' },
    { id: 37, name: 'Сочи' }
  ];

  // Сортируем регионы по важности (приоритетные города первыми)
  const sortedRegions = [...regions].sort((a, b) => {
    const aPriority = priorityCities.findIndex(city => city.id === a.id);
    const bPriority = priorityCities.findIndex(city => city.id === b.id);
    
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;
    
    return a.name.localeCompare(b.name);
  });

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

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
        {/* City Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Город</label>
          <Select value={filters.regionId?.toString() || "all"} onValueChange={(value) => handleFilterChange('regionId', value === "all" ? undefined : parseInt(value))}>
            <SelectTrigger>
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
          <label className="block text-sm font-medium text-gray-700 mb-3">Тип недвижимости</label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={filters.marketType === 'secondary' ? "default" : "outline"}
              onClick={() => handleFilterChange('marketType', filters.marketType === 'secondary' ? undefined : 'secondary')}
              className="h-10"
            >
              Вторичка
            </Button>
            <Button
              variant={filters.marketType === 'new_construction' ? "default" : "outline"}
              onClick={() => handleFilterChange('marketType', filters.marketType === 'new_construction' ? undefined : 'new_construction')}
              className="h-10"
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
            onValueChange={(value) => handleFilterChange('propertyClassId', value === "all" ? undefined : parseInt(value))}
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
                      {propertyClass.minPricePerSqm.toLocaleString()}-
                      {propertyClass.maxPricePerSqm === 999999999 
                        ? "∞" 
                        : propertyClass.maxPricePerSqm.toLocaleString()
                      } ₽/м²
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
              onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
            />
            <Input
              type="number"
              placeholder="до ₽"
              value={filters.maxPrice || ''}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
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
                  onClick={() => handleFilterChange('rooms', isSelected ? undefined : rooms)}
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