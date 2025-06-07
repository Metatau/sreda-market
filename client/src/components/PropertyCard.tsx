import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { PropertyWithRelations } from "@/types";

interface PropertyCardProps {
  property: PropertyWithRelations;
  onSelect?: (property: PropertyWithRelations) => void;
}

export function PropertyCard({ property, onSelect }: PropertyCardProps) {
  const handleClick = () => {
    onSelect?.(property);
  };

  // Extract property class name for badge
  const propertyClassName = property.propertyClass?.name || "Стандарт";
  
  // Calculate price per sqm if not available
  const pricePerSqm = property.pricePerSqm || (property.price && property.area ? 
    Math.round(property.price / parseFloat(property.area || "50")) : null);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-[16px] font-normal">{property.title}</h3>
            <p className="text-sm text-gray-600 truncate">{property.address}</p>
            <p className="text-sm text-gray-500">
              {property.region?.name} • {propertyClassName}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="font-bold text-gray-900 text-[24px]">
            {property.price.toLocaleString('ru-RU')} ₽
          </div>
          {pricePerSqm && (
            <div className="text-sm text-gray-600">
              {pricePerSqm.toLocaleString('ru-RU')} ₽/м²
            </div>
          )}
        </div>

        <Button 
          onClick={handleClick}
          className="w-full"
          variant="outline"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Рассчитать аналитику
        </Button>
      </CardContent>
    </Card>
  );
}