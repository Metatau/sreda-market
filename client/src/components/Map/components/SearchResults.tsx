import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  onResultSelect: (result: SearchResult) => void;
  onClose: () => void;
}

export function SearchResults({ results, onResultSelect, onClose }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <Card className="absolute top-16 left-4 right-4 z-20 max-h-80 overflow-y-auto bg-white/95 backdrop-blur-sm">
      <CardContent className="p-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Результаты поиска</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
        
        <div className="space-y-1">
          {results.map((result, index) => (
            <button
              key={index}
              className="w-full text-left p-2 text-sm hover:bg-gray-100 rounded-md transition-colors flex items-start gap-2"
              onClick={() => {
                onResultSelect(result);
                onClose();
              }}
            >
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 truncate">{result.display_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {result.type} • Важность: {(result.importance * 100).toFixed(0)}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}