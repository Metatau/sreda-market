import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { CalendarIcon, SearchIcon, TagIcon, ClockIcon, ExternalLinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Insight {
  id: number;
  title: string;
  content: string;
  summary: string;
  publishDate: string;
  tags: string[];
  readTime: number;
  sources: string[];
  chartData?: any;
  isPublished: boolean;
  authorId?: number;
}

interface InsightFilters {
  search: string;
  tags: string[];
  sortBy: 'date' | 'popularity';
}

export default function Insights() {
  const [filters, setFilters] = useState<InsightFilters>({
    search: '',
    tags: [],
    sortBy: 'date'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  // Fetch insights data
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/insights', { 
      search: filters.search,
      tags: filters.tags.join(','),
      page: currentPage,
      limit: 12
    }],
    enabled: true
  });

  // Fetch available tags
  const { data: tagsData } = useQuery({
    queryKey: ['/api/insights/tags'],
    enabled: true
  });

  const insights = (insightsData as any)?.data?.insights || [];
  const totalPages = (insightsData as any)?.data?.totalPages || 1;
  const availableTags = (tagsData as any)?.data || [];

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
  };

  const handleTagFilter = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
    setCurrentPage(1);
  };

  // Функция для определения цвета тегов
  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    
    if (tagLower.includes('иш') || tagLower.includes('ai') || tagLower.includes('технолог') || tagLower.includes('инновац')) {
      return {
        bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
        text: 'text-white',
        border: 'border-purple-300',
        ring: 'ring-purple-300',
        hoverBg: 'hover:bg-purple-50',
        dot: 'bg-purple-400'
      };
    }
    
    if (tagLower.includes('инвестиц') || tagLower.includes('доходност') || tagLower.includes('финанс')) {
      return {
        bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
        text: 'text-white',
        border: 'border-green-300',
        ring: 'ring-green-300',
        hoverBg: 'hover:bg-green-50',
        dot: 'bg-green-400'
      };
    }
    
    if (tagLower.includes('москв') || tagLower.includes('спб') || tagLower.includes('регион') || tagLower.includes('район')) {
      return {
        bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        text: 'text-white',
        border: 'border-blue-300',
        ring: 'ring-blue-300',
        hoverBg: 'hover:bg-blue-50',
        dot: 'bg-blue-400'
      };
    }
    
    if (tagLower.includes('esg') || tagLower.includes('эколог') || tagLower.includes('зелен') || tagLower.includes('энерг')) {
      return {
        bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
        text: 'text-white',
        border: 'border-emerald-300',
        ring: 'ring-emerald-300',
        hoverBg: 'hover:bg-emerald-50',
        dot: 'bg-emerald-400'
      };
    }
    
    if (tagLower.includes('коммерч') || tagLower.includes('офис') || tagLower.includes('склад')) {
      return {
        bg: 'bg-gradient-to-r from-orange-500 to-red-500',
        text: 'text-white',
        border: 'border-orange-300',
        ring: 'ring-orange-300',
        hoverBg: 'hover:bg-orange-50',
        dot: 'bg-orange-400'
      };
    }
    
    // По умолчанию
    return {
      bg: 'bg-gradient-to-r from-indigo-500 to-blue-500',
      text: 'text-white',
      border: 'border-indigo-300',
      ring: 'ring-indigo-300',
      hoverBg: 'hover:bg-indigo-50',
      dot: 'bg-indigo-400'
    };
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'd MMMM yyyy', { locale: ru });
  };

  // Функция для определения цвета тегов  
  const getTagColorForCard = (tag: string) => {
    const tagLower = tag.toLowerCase();
    
    if (tagLower.includes('иш') || tagLower.includes('ai') || tagLower.includes('технолог') || tagLower.includes('инновац')) {
      return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200';
    }
    
    if (tagLower.includes('инвестиц') || tagLower.includes('доходност') || tagLower.includes('финанс')) {
      return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
    }
    
    if (tagLower.includes('москв') || tagLower.includes('спб') || tagLower.includes('регион') || tagLower.includes('район')) {
      return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200';
    }
    
    if (tagLower.includes('esg') || tagLower.includes('эколог') || tagLower.includes('зелен') || tagLower.includes('энерг')) {
      return 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200';
    }
    
    if (tagLower.includes('коммерч') || tagLower.includes('офис') || tagLower.includes('склад')) {
      return 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border-orange-200';
    }
    
    return 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-800 border-indigo-200';
  };

  const renderCharts = (chartData: any) => {
    if (!chartData?.charts) return null;

    return (
      <div className="mt-6">
        <h4 className="text-lg font-semibold mb-4">Аналитические данные</h4>
        {chartData.charts.map((chart: any, index: number) => (
          <div key={index} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h5 className="font-medium mb-3">{chart.title}</h5>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {chart.type === 'line' && (
                <div>
                  <p>Динамика изменений:</p>
                  {chart.data?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.month || item.region}</span>
                      <span>{Object.entries(item).filter(([key]) => key !== 'month' && key !== 'region').map(([key, value]) => `${key}: ${value}`).join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}
              {chart.type === 'bar' && (
                <div>
                  <p>Рейтинговые данные:</p>
                  {chart.data?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.region || item.type}</span>
                      <span className="font-medium">{item.score || item.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {chart.type === 'pie' && (
                <div>
                  <p>Изменения по категориям:</p>
                  {chart.data?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{item.type}</span>
                      <span className={`font-medium ${item.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change > 0 ? '+' : ''}{item.change}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (insightsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Аналитические Инсайты
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Глубокая аналитика рынка недвижимости, инвестиционные тренды и прогнозы от экспертов SREDA Market
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по заголовкам и содержанию..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filters.sortBy} onValueChange={(value: 'date' | 'popularity') => setFilters(prev => ({ ...prev, sortBy: value }))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">По дате</SelectItem>
              <SelectItem value="popularity">По популярности</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Популярные темы:</h3>
            <div className="flex flex-wrap gap-3">
              {availableTags.map((tag: string) => {
                const isSelected = filters.tags.includes(tag);
                const tagColor = getTagColor(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleTagFilter(tag)}
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-md ${
                      isSelected 
                        ? `${tagColor.bg} ${tagColor.text} shadow-lg ring-2 ring-offset-2 ${tagColor.ring}` 
                        : `bg-white dark:bg-gray-800 border-2 ${tagColor.border} ${tagColor.hoverBg} text-gray-700 dark:text-gray-300 hover:${tagColor.text}`
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${isSelected ? 'bg-white/80' : tagColor.dot}`}></span>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights Grid */}
        {insights.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Аналитические материалы не найдены</p>
              <p className="text-sm">Попробуйте изменить параметры поиска</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {insights.map((insight: Insight) => (
              <Card 
                key={insight.id} 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => setSelectedInsight(insight)}
              >
                <CardHeader>
                  <CardTitle className="text-lg font-semibold line-clamp-2 text-gray-900 dark:text-white">
                    {insight.title}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(insight.publishDate)}
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {insight.readTime} мин
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {insight.summary}
                  </p>
                  
                  {insight.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {insight.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {insight.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{insight.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button variant="outline" size="sm" className="w-full">
                    Читать полностью
                    <ExternalLinkIcon className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Назад
            </Button>
            
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                variant={currentPage === i + 1 ? "default" : "outline"}
                onClick={() => setCurrentPage(i + 1)}
                className="w-10"
              >
                {i + 1}
              </Button>
            ))}
            
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Вперед
            </Button>
          </div>
        )}
      </div>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedInsight.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(selectedInsight.publishDate)}
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {selectedInsight.readTime} мин чтения
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInsight(null)}
                >
                  ×
                </Button>
              </div>

              <div className="prose prose-lg max-w-none dark:prose-invert mb-6">
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  {selectedInsight.summary}
                </p>
                <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {selectedInsight.content}
                </div>
              </div>

              {selectedInsight.chartData && renderCharts(selectedInsight.chartData)}

              {selectedInsight.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Теги:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInsight.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedInsight.sources.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Источники:</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedInsight.sources.map((source, index) => (
                      <li key={index}>• {source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}