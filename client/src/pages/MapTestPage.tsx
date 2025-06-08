import { useState } from 'react';
import { PropertyMap } from '@/components/Map/PropertyMapRefactored';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CITIES = [
  { id: 1, name: "Москва" },
  { id: 2, name: "Санкт-Петербург" },
  { id: 3, name: "Новосибирск" },
  { id: 4, name: "Екатеринбург" },
  { id: 5, name: "Казань" },
  { id: 11, name: "Уфа" },
  { id: 12, name: "Красноярск" },
  { id: 13, name: "Пермь" },
  { id: 35, name: "Калининград" },
  { id: 36, name: "Тюмень" },
  { id: 37, name: "Сочи" }
];

export default function MapTestPage() {
  const [selectedRegion, setSelectedRegion] = useState<number>(1);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['/api/properties', selectedRegion],
    queryFn: () => fetch(`/api/properties?region_id=${selectedRegion}`).then(res => res.json()).then(data => data.data.properties),
    enabled: !!selectedRegion
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Тест координат по всем городам</h1>
        
        <div className="flex gap-4 items-center mb-4">
          <Select value={selectedRegion.toString()} onValueChange={(value) => setSelectedRegion(Number(value))}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Выберите город" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map(city => (
                <SelectItem key={city.id} value={city.id.toString()}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="text-sm text-gray-600">
            Найдено недвижимости: {properties.length}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Координаты недвижимости:</h3>
            <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
              {isLoading ? (
                <div>Загрузка...</div>
              ) : properties.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {properties.map((property: any) => (
                    <li key={property.id} className="flex justify-between">
                      <span>ID {property.id}:</span>
                      <span className="font-mono">{property.coordinates}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>Нет данных для выбранного города</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Карта:</h3>
            <div className="h-64 border rounded">
              <PropertyMap
                properties={properties}
                regionId={selectedRegion}
                onPropertySelect={(property: any) => console.log('Selected:', property)}
                activeMapTool="none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}