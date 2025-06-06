import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Filter, 
  Clock, 
  TrendingUp, 
  BarChart3,
  FileText,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { format, isAfter, isBefore, subDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface InsightNote {
  id: string;
  title: string;
  content: string;
  summary: string;
  publishDate: Date;
  tags: string[];
  readTime: number;
  sources: string[];
  charts?: ChartData[];
}

interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  config: any;
}

interface InsightFilters {
  dateFrom?: Date;
  dateTo?: Date;
  tags: string[];
  search: string;
}

export default function Insights() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<InsightNote[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filters, setFilters] = useState<InsightFilters>({
    tags: [],
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Debounceed search
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout>();

  const fetchInsights = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      });

      if (filters.dateFrom) {
        params.append('date_from', format(filters.dateFrom, 'yyyy-MM-dd'));
      }
      if (filters.dateTo) {
        params.append('date_to', format(filters.dateTo, 'yyyy-MM-dd'));
      }
      if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.search.trim()) {
        params.append('search', filters.search.trim());
      }

      const response = await apiRequest('GET', `/api/insights?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setInsights(data.data.insights);
        setTotalPages(data.data.totalPages);
        setCurrentPage(page);
      } else {
        throw new Error(data.error || 'Ошибка загрузки инсайтов');
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить аналитические заметки",
        variant: "destructive",
      });
      // Mock data for development
      setInsights([
        {
          id: '1',
          title: 'Анализ рынка недвижимости Москвы - Октябрь 2024',
          summary: 'Рынок недвижимости Москвы показывает стабильный рост цен на 3.2% за месяц. Наибольший спрос наблюдается в сегменте 1-2 комнатных квартир.',
          content: 'Детальный анализ показывает, что рынок недвижимости Москвы продолжает демонстрировать устойчивую динамику роста. Средняя стоимость квадратного метра увеличилась на 3.2% по сравнению с предыдущим месяцем...',
          publishDate: new Date('2024-10-15'),
          tags: ['Москва', 'Аналитика', 'Цены', 'Тренды'],
          readTime: 5,
          sources: ['Avito', 'ЦИАН', 'Domofond']
        },
        {
          id: '2',
          title: 'Инвестиционная привлекательность районов СПБ',
          summary: 'Исследование показывает рост инвестиционной привлекательности спальных районов Санкт-Петербурга на фоне развития транспортной инфраструктуры.',
          content: 'Анализ данных за последние 6 месяцев выявил значительное увеличение спроса на недвижимость в отдаленных районах города...',
          publishDate: new Date('2024-10-14'),
          tags: ['СПБ', 'Инвестиции', 'Районы', 'Транспорт'],
          readTime: 7,
          sources: ['СПБ.Недвижимость', 'Петербургская недвижимость']
        }
      ]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await apiRequest('GET', '/api/insights/tags');
      const data = await response.json();
      
      if (data.success) {
        setAvailableTags(data.data);
      } else {
        throw new Error(data.error || 'Ошибка загрузки тегов');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      // Mock tags for development
      setAvailableTags([
        'Москва', 'СПБ', 'Аналитика', 'Цены', 'Тренды', 
        'Инвестиции', 'Районы', 'Транспорт', 'Новостройки', 
        'Вторичный рынок', 'Коммерческая недвижимость'
      ]);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchInsights(1);
  }, [fetchInsights]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    const timeout = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    
    setSearchDebounce(timeout);
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
    setCurrentPage(1);
  };

  const handleDateFilter = (dateFrom?: Date, dateTo?: Date) => {
    setFilters(prev => ({ ...prev, dateFrom, dateTo }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ tags: [], search: '' });
    setCurrentPage(1);
  };

  const toggleCardExpansion = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const formatDate = (date: Date) => {
    return format(date, 'd MMMM yyyy', { locale: ru });
  };

  const getReadTimeText = (minutes: number) => {
    if (minutes === 1) return '1 минута';
    if (minutes < 5) return `${minutes} минуты`;
    return `${minutes} минут`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Аналитические инсайты
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Ежедневные аналитические заметки на основе данных рынка недвижимости
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Скрыть' : 'Показать'}
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по ключевым словам..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateFrom ? formatDate(filters.dateFrom) : "Дата от"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateFrom}
                    onSelect={(date) => handleDateFilter(date, filters.dateTo)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateTo ? formatDate(filters.dateTo) : "Дата до"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateTo}
                    onSelect={(date) => handleDateFilter(filters.dateFrom, date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Tags */}
            <div>
              <h4 className="text-sm font-medium mb-2">Теги</h4>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleTagToggle(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Сбросить фильтры
              </Button>
              <Button size="sm" onClick={() => fetchInsights(1)}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Обновить
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Загрузка инсайтов...</span>
        </div>
      )}

      {/* Insights Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {insights.map((insight) => (
            <Card key={insight.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg leading-tight line-clamp-2">
                    {insight.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCardExpansion(insight.id)}
                  >
                    {expandedCard === insight.id ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <CardDescription className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {formatDate(insight.publishDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getReadTimeText(insight.readTime)}
                  </span>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {expandedCard === insight.id ? insight.content : insight.summary}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {insight.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Sources */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="h-3 w-3" />
                  <span>Источники: {insight.sources.join(', ')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && insights.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Инсайты не найдены
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            По заданным фильтрам аналитические заметки не найдены
          </p>
          <Button onClick={clearFilters}>
            Сбросить фильтры
          </Button>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && insights.length > 0 && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInsights(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </Button>
          
          <span className="px-4 py-2 text-sm">
            Страница {currentPage} из {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInsights(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Вперед
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}