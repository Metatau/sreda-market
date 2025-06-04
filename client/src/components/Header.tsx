import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { regionApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Search, Heart, Bell } from "lucide-react";

interface HeaderProps {
  selectedRegionId?: number;
  onRegionChange?: (regionId: number | undefined) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: () => void;
}

export function Header({
  selectedRegionId,
  onRegionChange,
  searchQuery = "",
  onSearchChange,
  onSearch
}: HeaderProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const { data: regions = [] } = useQuery({
    queryKey: ['/api/regions'],
    queryFn: regionApi.getAll,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange?.(localSearchQuery);
    onSearch?.();
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(e as any);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SREDA Market</h1>
              <p className="text-xs text-gray-500">ИИ-сервис недвижимости</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Поиск по адресу, району или названию..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="pl-10 pr-4 py-2.5 w-full"
              />
            </form>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Region Selector */}
            <Select
              value={selectedRegionId?.toString() || ""}
              onValueChange={(value) => onRegionChange?.(value ? parseInt(value) : undefined)}
            >
              <SelectTrigger className="w-48">
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

            {/* User Actions */}
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-primary">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-600 hover:text-primary">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">T</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
