import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types';

interface PropertyPopupProps {
  property: Property;
  onSelect: (property: Property) => void;
}

const getPropertyClassColor = (className: string): string => {
  const colors: Record<string, string> = {
    'Эконом': 'bg-blue-100 text-blue-700',
    'Комфорт': 'bg-yellow-100 text-yellow-700',
    'Бизнес': 'bg-orange-100 text-orange-700',
    'Элит': 'bg-red-100 text-red-700',
  };
  return colors[className] || 'bg-gray-100 text-gray-700';
};

const formatPrice = (price: number): string => {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M ₽`;
  }
  return `${price.toLocaleString()} ₽`;
};

export function PropertyPopup({ property, onSelect }: PropertyPopupProps) {
  return (
    <Card className="w-80 max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          {property.propertyClass && (
            <Badge className={getPropertyClassColor(property.propertyClass.name)}>
              {property.propertyClass.name}
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm">
          {property.title}
        </h3>

        <div className="flex items-center text-xs text-gray-600 mb-2">
          <i className="fas fa-map-marker-alt mr-1"></i>
          <span className="truncate">{property.address}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-gray-900">
            {formatPrice(property.price)}
          </div>
          {property.pricePerSqm && (
            <div className="text-xs text-gray-500">
              {property.pricePerSqm.toLocaleString()} ₽/м²
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          {property.area && (
            <span>
              <i className="fas fa-expand-arrows-alt mr-1"></i>
              {property.area} м²
            </span>
          )}
          {property.rooms !== undefined && (
            <span>
              <i className="fas fa-door-open mr-1"></i>
              {property.rooms === 0 ? "Студия" : `${property.rooms} комн.`}
            </span>
          )}
          {property.floor && property.totalFloors && (
            <span>
              <i className="fas fa-building mr-1"></i>
              {property.floor}/{property.totalFloors} эт.
            </span>
          )}
        </div>

        {/* Investment Metrics */}
        {(property.analytics?.roi || property.analytics?.liquidityScore) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 mb-3">
            <div className="flex items-center space-x-3">
              {property.analytics?.roi && (
                <div className="flex items-center space-x-1">
                  <i className="fas fa-chart-line text-green-600 text-xs"></i>
                  <span className="text-xs text-gray-600">ROI:</span>
                  <span className="text-xs font-semibold text-green-600">
                    {property.analytics.roi}%
                  </span>
                </div>
              )}
              {property.analytics?.liquidityScore && (
                <div className="flex items-center space-x-1">
                  <i className="fas fa-tachometer-alt text-orange-600 text-xs"></i>
                  <span className="text-xs text-gray-600">Ликв:</span>
                  <span className="text-xs font-semibold text-orange-600">
                    {property.analytics.liquidityScore}/10
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <Button 
          size="sm" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-xs"
          onClick={() => onSelect(property)}
        >
          Подробнее
        </Button>
      </CardContent>
    </Card>
  );
}