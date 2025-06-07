import React, { useState } from 'react';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import type { PropertyFilters } from '@/types';

export function FilterTest() {
  const [filters, setFilters] = useState<PropertyFilters>({});
  const { data: propertiesData, isLoading } = useProperties(filters, 1, 10);

  const properties = propertiesData?.properties || [];

  const testSecondaryFilter = () => {
    console.log('Testing secondary market filter');
    const newFilters = { marketType: 'secondary' as const };
    console.log('Setting filters to:', newFilters);
    setFilters(newFilters);
  };

  const testNewConstructionFilter = () => {
    console.log('Testing new construction filter');
    const newFilters = { marketType: 'new_construction' as const };
    console.log('Setting filters to:', newFilters);
    setFilters(newFilters);
  };

  const clearFilters = () => {
    console.log('Clearing filters');
    setFilters({});
  };

  console.log('FilterTest render - Current filters:', filters);
  console.log('FilterTest render - Properties count:', properties.length);
  console.log('FilterTest render - Loading:', isLoading);

  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-lg font-bold mb-4">Filter Test Component</h3>
      
      <div className="space-x-2 mb-4">
        <Button onClick={testSecondaryFilter}>
          Test Secondary Market
        </Button>
        <Button onClick={testNewConstructionFilter}>
          Test New Construction
        </Button>
        <Button onClick={clearFilters} variant="outline">
          Clear Filters
        </Button>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <p>Current filters: {JSON.stringify(filters)}</p>
        <p>Properties count: {properties.length}</p>
        <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      </div>

      {isLoading && <div>Loading properties...</div>}
      
      {!isLoading && (
        <div className="space-y-2">
          <h4 className="font-semibold">Properties:</h4>
          {properties.map(property => (
            <div key={property.id} className="text-xs p-2 bg-gray-50 rounded">
              {property.title} - {property.marketType}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}