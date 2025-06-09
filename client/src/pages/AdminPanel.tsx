import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle, Key, BarChart, Users, Settings, Globe, MessageSquare, FileText, Plus, Search, ToggleLeft, ToggleRight, Eye, Edit, Trash2, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";

interface AdsApiStatus {
  available: boolean;
  configured: boolean;
  regions: string[];
}

interface SyncResult {
  imported: number;
  updated: number;
  errors: string[];
}

interface DataSource {
  id: number;
  name: string;
  description?: string;
  type: string;
  config: any;
  tags: string[];
  isActive: boolean;
  frequency: string;
  lastUpdated?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showCredentials, setShowCredentials] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sourcesSearchTerm, setSourcesSearchTerm] = useState('');
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [newSourceForm, setNewSourceForm] = useState({
    name: '',
    description: '',
    type: '',
    frequency: 'daily',
    tags: '',
    config: {
      websiteUrl: '',
      channelUrl: '',
      channelUsername: '',
      rssUrl: '',
      fileName: '',
      keywords: ''
    }
  });

  // Состояние для управления тарифными планами
  const [pricingPlans, setPricingPlans] = useState([
    {
      id: 'basic',
      name: 'Базовый',
      price: 2990,
      period: 'месяц',
      features: [
        { name: 'AI-запросов/день', value: '10' },
        { name: 'Глубина анализа', value: '1 год' },
        { name: 'Экспорт в PDF', enabled: false },
        { name: 'Инсайты рынка', enabled: false },
        { name: 'Поддержка 24/7', enabled: false }
      ]
    },
    {
      id: 'premium',
      name: 'Премиум',
      price: 7990,
      period: 'месяц',
      popular: true,
      features: [
        { name: 'AI-запросов/день', value: '∞' },
        { name: 'Глубина анализа', value: '3 года' },
        { name: 'Экспорт в PDF', enabled: true },
        { name: 'Инсайты рынка', enabled: true },
        { name: 'Поддержка 24/7', enabled: true }
      ]
    }
  ]);

  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  // Debug form state
  console.log('Form state:', newSourceForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adsApiStatus, isLoading: statusLoading } = useQuery<AdsApiStatus>({
    queryKey: ['/api/admin/ads-api/status'],
    refetchInterval: 30000, // Обновляем каждые 30 секунд
    enabled: isAuthenticated && user?.roles?.includes('admin')
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery<{ sources: DataSource[] }>({
    queryKey: ['/api/admin/sources'],
    enabled: activeTab === 'sources' && isAuthenticated && user?.roles?.includes('admin')
  });

  // Filter sources based on search and type
  const filteredSources = useMemo(() => {
    // Проверяем правильную структуру данных от API
    const sources = sourcesData?.data || sourcesData?.sources || [];
    
    if (sources.length === 0) return [];
    
    return sources.filter((source: DataSource) => {
      const matchesSearch = !sourcesSearchTerm || 
        source.name?.toLowerCase().includes(sourcesSearchTerm.toLowerCase()) ||
        source.description?.toLowerCase().includes(sourcesSearchTerm.toLowerCase()) ||
        source.tags?.some((tag: string) => tag.toLowerCase().includes(sourcesSearchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }, [sourcesData, sourcesSearchTerm]);

  // Мутации для источников данных
  const toggleSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/sources/${id}/toggle`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Статус источника изменен' });
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/sources/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Источник удален' });
    }
  });

  const createSourceMutation = useMutation({
    mutationFn: async (sourceData: any) => {
      console.log('Creating source with apiRequest:', sourceData);
      return await apiRequest('/api/admin/sources', { method: 'POST', body: JSON.stringify(sourceData), headers: { 'Content-Type': 'application/json' } });
    },
    onSuccess: (data) => {
      console.log('Source created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Источник создан' });
      setIsAddSourceDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      console.error('Error creating source:', error);
      toast({ 
        title: 'Ошибка создания источника', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/admin/sources/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Источник обновлен' });
      setIsAddSourceDialogOpen(false);
      setEditingSource(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Ошибка обновления', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (params: { regions?: string[]; credentials?: { email: string; password: string } }) => {
      return await apiRequest('/api/admin/ads-api/sync', { method: 'POST', body: JSON.stringify(params), headers: { 'Content-Type': 'application/json' } });
    },
    onSuccess: (data: { success: boolean } & SyncResult) => {
      if (data.success) {
        toast({
          title: "Синхронизация завершена",
          description: `Импортировано: ${data.imported}, Обновлено: ${data.updated}`,
        });
        if (data.errors.length > 0) {
          toast({
            title: "Предупреждения при синхронизации",
            description: `${data.errors.length} ошибок. Проверьте логи.`,
            variant: "destructive",
          });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Ошибка синхронизации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRegionToggle = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const handleSyncAll = () => {
    if (!credentials.email || !credentials.password) {
      toast({
        title: "Введите учетные данные",
        description: "Необходимо указать логин и пароль для ads-api.ru",
        variant: "destructive",
      });
      setShowCredentials(true);
      return;
    }
    syncMutation.mutate({ credentials });
  };

  const handleSyncSelected = () => {
    if (selectedRegions.length === 0) {
      toast({
        title: "Выберите регионы",
        description: "Необходимо выбрать хотя бы один регион для синхронизации",
        variant: "destructive",
      });
      return;
    }
    if (!credentials.email || !credentials.password) {
      toast({
        title: "Введите учетные данные",
        description: "Необходимо указать логин и пароль для ads-api.ru",
        variant: "destructive",
      });
      setShowCredentials(true);
      return;
    }
    syncMutation.mutate({ regions: selectedRegions, credentials });
  };

  // Функции для источников данных
  const handleToggleSource = (source: DataSource) => {
    toggleSourceMutation.mutate(source.id);
  };

  const handleDeleteSource = (source: DataSource) => {
    if (confirm('Вы уверены, что хотите удалить этот источник данных?')) {
      deleteSourceMutation.mutate(source.id);
    }
  };

  const handleViewSource = (source: DataSource) => {
    toast({
      title: `Источник: ${source.name}`,
      description: `Тип: ${getSourceTypeLabel(source.type)}, Статус: ${source.isActive ? 'Активен' : 'Неактивен'}`,
    });
  };

  const handleEditSource = (source: DataSource) => {
    setEditingSource(source);
    setNewSourceForm({
      name: source.name,
      description: source.description || '',
      type: source.type,
      frequency: source.frequency,
      tags: source.tags?.join(', ') || '',
      config: {
        websiteUrl: source.config?.websiteUrl || '',
        channelUrl: source.config?.channelUrl || '',
        channelUsername: source.config?.channelUsername || '',
        rssUrl: source.config?.rssUrl || '',
        fileName: source.config?.fileName || '',
        keywords: source.config?.keywords?.join(', ') || ''
      }
    });
    setIsAddSourceDialogOpen(true);
  };

  const getSourceTypeIcon = (type: string) => {
    const icons = {
      telegram_channel: MessageSquare,
      website: Globe,
      rss_feed: Database,
      uploaded_file: FileText,
      spreadsheet: FileText,
      pdf_document: FileText
    };
    const IconComponent = icons[type as keyof typeof icons] || Database;
    return <IconComponent className="h-4 w-4" />;
  };

  const getSourceTypeLabel = (type: string) => {
    const labels = {
      telegram_channel: 'Telegram канал',
      website: 'Веб-сайт',
      rss_feed: 'RSS лента',
      uploaded_file: 'Загруженный файл',
      spreadsheet: 'Таблица',
      pdf_document: 'PDF документ'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const resetForm = () => {
    setEditingSource(null);
    setNewSourceForm({
      name: '',
      description: '',
      type: '',
      frequency: 'daily',
      tags: '',
      config: {
        websiteUrl: '',
        channelUrl: '',
        channelUsername: '',
        rssUrl: '',
        fileName: '',
        keywords: ''
      }
    });
  };

  const handleSubmitSource = () => {
    if (!newSourceForm.name || !newSourceForm.type) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля: название и тип источника',
        variant: 'destructive'
      });
      return;
    }

    // Дополнительная валидация в зависимости от типа
    if (newSourceForm.type === 'telegram_channel' && !newSourceForm.config.channelUrl) {
      toast({
        title: 'Ошибка',
        description: 'Для Telegram канала укажите URL канала',
        variant: 'destructive'
      });
      return;
    }

    if (newSourceForm.type === 'website' && !newSourceForm.config.websiteUrl) {
      toast({
        title: 'Ошибка',
        description: 'Для веб-сайта укажите URL',
        variant: 'destructive'
      });
      return;
    }

    if (newSourceForm.type === 'rss_feed' && !newSourceForm.config.rssUrl) {
      toast({
        title: 'Ошибка',
        description: 'Для RSS ленты укажите URL',
        variant: 'destructive'
      });
      return;
    }

    const sourceData = {
      name: newSourceForm.name,
      description: newSourceForm.description || undefined,
      type: newSourceForm.type,
      frequency: newSourceForm.frequency,
      tags: newSourceForm.tags ? newSourceForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
      config: getConfigForType(newSourceForm.type)
    };

    if (editingSource) {
      console.log('Updating source with data:', sourceData);
      updateSourceMutation.mutate({
        id: editingSource.id,
        data: sourceData
      });
    } else {
      console.log('Creating source with data:', sourceData);
      createSourceMutation.mutate(sourceData);
    }
  };

  const getConfigForType = (type: string) => {
    switch (type) {
      case 'website':
        return {
          websiteUrl: newSourceForm.config.websiteUrl,
          keywords: newSourceForm.config.keywords ? newSourceForm.config.keywords.split(',').map(k => k.trim()) : []
        };
      case 'telegram_channel':
        return {
          channelUrl: newSourceForm.config.channelUrl,
          channelUsername: newSourceForm.config.channelUrl.includes('@') ? newSourceForm.config.channelUrl : undefined,
          keywords: newSourceForm.config.keywords ? newSourceForm.config.keywords.split(',').map(k => k.trim()) : []
        };
      case 'rss_feed':
        return {
          rssUrl: newSourceForm.config.rssUrl,
          keywords: newSourceForm.config.keywords ? newSourceForm.config.keywords.split(',').map(k => k.trim()) : []
        };
      case 'uploaded_file':
      case 'spreadsheet':
      case 'pdf_document':
        return {
          fileName: newSourceForm.config.fileName,
          keywords: newSourceForm.config.keywords ? newSourceForm.config.keywords.split(',').map(k => k.trim()) : []
        };
      default:
        return {};
    }
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Административная панель</h1>
        </div>

        {/* Табы навигации */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <BarChart className="w-4 h-4" />
              <span>Обзор</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'sources'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Источники данных</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Пользователи</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'pricing'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Тарифы</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('promocodes')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'promocodes'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Key className="w-4 h-4" />
              <span>Промокоды</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Настройки</span>
            </div>
          </button>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Статистика платформы */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="w-5 h-5" />
                  <span>Статистика платформы</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">245</div>
                    <div className="text-sm text-blue-700">Всего объектов</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">42</div>
                    <div className="text-sm text-green-700">Новых за неделю</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">18</div>
                    <div className="text-sm text-purple-700">Активных регионов</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">156</div>
                    <div className="text-sm text-orange-700">AI запросов сегодня</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Статус ADS API */}
            <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Статус ADS API</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <span className="font-medium">Конфигурация:</span>
              {adsApiStatus?.configured ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Настроен
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-4 h-4 mr-1" />
                  Не настроен
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className="font-medium">Доступность:</span>
              {adsApiStatus?.available ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Подключен
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Недоступен
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className="font-medium">Регионов:</span>
              <Badge variant="outline">
                {adsApiStatus?.regions?.length || 0}
              </Badge>
            </div>
          </div>

          {/* Дополнительная информация о статусе API */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Информация о подключении</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Используется официальное API ads-api.ru</p>
              <p>• Endpoint: https://ads-api.ru/main/api</p>
              <p>• Лимит: 1 запрос каждые 5 секунд</p>
              <p>• Получение актуальных объявлений о недвижимости</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Учетные данные ADS API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Учетные данные ads-api.ru</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (логин)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Пароль от ads-api.ru"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Для синхронизации данных необходимы учетные данные от сервиса ads-api.ru. 
              Эти данные используются только для получения актуальной информации о недвижимости.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Синхронизация данных */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5" />
            <span>Синхронизация недвижимости</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {credentials.email && credentials.password ? (
            <>
              {/* Регионы для синхронизации */}
              {adsApiStatus?.regions && adsApiStatus.regions.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Доступные регионы:</h3>
                  <div className="flex flex-wrap gap-2">
                    {adsApiStatus.regions.map((region) => (
                      <Button
                        key={region}
                        variant={selectedRegions.includes(region) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleRegionToggle(region)}
                        className="text-sm"
                      >
                        {region}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Кнопки синхронизации */}
              <div className="flex space-x-4">
                <Button
                  onClick={handleSyncAll}
                  disabled={syncMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>{syncMutation.isPending ? 'Синхронизация...' : 'Синхронизировать все'}</span>
                </Button>

                {selectedRegions.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleSyncSelected}
                    disabled={syncMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>
                      {syncMutation.isPending 
                        ? 'Синхронизация...' 
                        : `Синхронизировать выбранные (${selectedRegions.length})`
                      }
                    </span>
                  </Button>
                )}
              </div>

              {/* Информация о синхронизации */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Информация о синхронизации:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Синхронизация загружает новые объявления о недвижимости</li>
                  <li>• Обновляет цены и данные существующих объектов</li>
                  <li>• Процесс может занять несколько минут в зависимости от объема данных</li>
                  <li>• Рекомендуется запускать синхронизацию ежедневно</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">ADS API настроен</span>
              </div>
              <p className="text-blue-700 mt-2">
                {adsApiStatus?.configured 
                  ? "API настроен, но требуется документация по правильным endpoint URLs. Обратитесь к support@ads-api.ru для получения документации API и правильных endpoint URLs."
                  : "Для запуска синхронизации необходимо указать логин и пароль от ads-api.ru в форме выше."
                }
              </p>
              {adsApiStatus?.configured && (
                <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                  <p className="text-sm text-yellow-800">
                    <strong>Требуется:</strong> Документация API с правильными endpoint URLs от ads-api.ru
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Все стандартные endpoints (/regions, /properties, /api, etc.) возвращают 404 ошибку
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Статистика платформы */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart className="w-5 h-5" />
            <span>Статистика платформы</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">245</div>
              <div className="text-sm text-blue-700">Всего объектов</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">42</div>
              <div className="text-sm text-green-700">Новых за неделю</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">18</div>
              <div className="text-sm text-purple-700">Активных регионов</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">156</div>
              <div className="text-sm text-orange-700">AI запросов сегодня</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Управление пользователями */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Управление пользователями</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Администраторы</div>
              <div className="text-sm text-gray-600">Полный доступ к системе</div>
            </div>
            <Badge variant="default">2 активных</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Зарегистрированные пользователи</div>
              <div className="text-sm text-gray-600">Доступ к AI чату и аналитике</div>
            </div>
            <Badge variant="outline">147 пользователей</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Telegram авторизация</div>
              <div className="text-sm text-gray-600">Быстрый вход через Telegram</div>
            </div>
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              Активна
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Системные настройки */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Системные настройки</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-2">AI модель</div>
              <div className="text-sm text-gray-600 mb-2">OpenAI GPT-4 для анализа недвижимости</div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Подключена
              </Badge>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-2">База данных</div>
              <div className="text-sm text-gray-600 mb-2">PostgreSQL с расширением PostGIS</div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Активна
              </Badge>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-2">Mapbox интеграция</div>
              <div className="text-sm text-gray-600 mb-2">Интерактивные карты недвижимости</div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Работает
              </Badge>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-2">ADS API интеграция</div>
              <div className="text-sm text-gray-600 mb-2">Автоматическая синхронизация данных</div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Подключена
              </Badge>
            </div>
          </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Вкладка Источники данных */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            {/* Поиск и контролы */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Поиск источников..."
                      value={sourcesSearchTerm}
                      onChange={(e) => setSourcesSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Dialog open={isAddSourceDialogOpen} onOpenChange={setIsAddSourceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Добавить источник
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingSource ? 'Редактировать источник данных' : 'Добавить новый источник данных'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingSource 
                            ? 'Измените настройки источника данных' 
                            : 'Создайте новый источник данных для сбора аналитической информации'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Основная информация */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Название источника *</Label>
                            <Input
                              id="name"
                              value={newSourceForm.name}
                              onChange={(e) => setNewSourceForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Введите название источника"
                            />
                          </div>

                          <div>
                            <Label htmlFor="description">Описание</Label>
                            <Textarea
                              id="description"
                              value={newSourceForm.description}
                              onChange={(e) => setNewSourceForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Краткое описание источника данных"
                              rows={3}
                            />
                          </div>

                          <div>
                            <Label htmlFor="type">Тип источника *</Label>
                            <select
                              id="type"
                              value={newSourceForm.type}
                              onChange={(e) => setNewSourceForm(prev => ({ ...prev, type: e.target.value }))}
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="">Выберите тип источника</option>
                              <option value="website">Веб-сайт</option>
                              <option value="telegram_channel">Telegram канал</option>
                              <option value="rss_feed">RSS лента</option>
                              <option value="uploaded_file">Загруженный файл</option>
                              <option value="spreadsheet">Таблица</option>
                              <option value="pdf_document">PDF документ</option>
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="frequency">Частота обновления</Label>
                            <select
                              id="frequency"
                              value={newSourceForm.frequency}
                              onChange={(e) => setNewSourceForm(prev => ({ ...prev, frequency: e.target.value }))}
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="hourly">Ежечасно</option>
                              <option value="daily">Ежедневно</option>
                              <option value="weekly">Еженедельно</option>
                            </select>
                          </div>

                          <div>
                            <Label htmlFor="tags">Теги</Label>
                            <Input
                              id="tags"
                              value={newSourceForm.tags}
                              onChange={(e) => setNewSourceForm(prev => ({ ...prev, tags: e.target.value }))}
                              placeholder="Теги через запятую"
                            />
                          </div>
                        </div>

                        {/* Конфигурация в зависимости от типа */}
                        {newSourceForm.type && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Настройки источника</h3>
                            
                            {newSourceForm.type === 'website' && (
                              <div>
                                <Label htmlFor="websiteUrl">URL веб-сайта</Label>
                                <Input
                                  id="websiteUrl"
                                  value={newSourceForm.config.websiteUrl}
                                  onChange={(e) => setNewSourceForm(prev => ({ 
                                    ...prev, 
                                    config: { ...prev.config, websiteUrl: e.target.value }
                                  }))}
                                  placeholder="https://example.com"
                                />
                              </div>
                            )}

                            {newSourceForm.type === 'telegram_channel' && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="channelUrl">URL Telegram канала</Label>
                                  <Input
                                    id="channelUrl"
                                    value={newSourceForm.config.channelUrl}
                                    onChange={(e) => setNewSourceForm(prev => ({ 
                                      ...prev, 
                                      config: { ...prev.config, channelUrl: e.target.value }
                                    }))}
                                    placeholder="https://t.me/channel_name"
                                  />
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Введите полный URL Telegram канала
                                  </p>
                                </div>
                                <div>
                                  <Label htmlFor="channelUsername">Username канала (опционально)</Label>
                                  <Input
                                    id="channelUsername"
                                    value={newSourceForm.config.channelUsername}
                                    onChange={(e) => setNewSourceForm(prev => ({ 
                                      ...prev, 
                                      config: { ...prev.config, channelUsername: e.target.value }
                                    }))}
                                    placeholder="@channel_name"
                                  />
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Username канала для дополнительной идентификации
                                  </p>
                                </div>
                              </div>
                            )}

                            {newSourceForm.type === 'rss_feed' && (
                              <div>
                                <Label htmlFor="rssUrl">URL RSS ленты</Label>
                                <Input
                                  id="rssUrl"
                                  value={newSourceForm.config.rssUrl}
                                  onChange={(e) => setNewSourceForm(prev => ({ 
                                    ...prev, 
                                    config: { ...prev.config, rssUrl: e.target.value }
                                  }))}
                                  placeholder="https://example.com/rss.xml"
                                />
                              </div>
                            )}

                            {(newSourceForm.type === 'uploaded_file' || newSourceForm.type === 'spreadsheet' || newSourceForm.type === 'pdf_document') && (
                              <div>
                                <Label htmlFor="fileName">Имя файла</Label>
                                <Input
                                  id="fileName"
                                  value={newSourceForm.config.fileName}
                                  onChange={(e) => setNewSourceForm(prev => ({ 
                                    ...prev, 
                                    config: { ...prev.config, fileName: e.target.value }
                                  }))}
                                  placeholder="example.xlsx"
                                />
                              </div>
                            )}

                            <div>
                              <Label htmlFor="keywords">Ключевые слова</Label>
                              <Input
                                id="keywords"
                                value={newSourceForm.config.keywords}
                                onChange={(e) => setNewSourceForm(prev => ({ 
                                  ...prev, 
                                  config: { ...prev.config, keywords: e.target.value }
                                }))}
                                placeholder="недвижимость, инвестиции, аналитика"
                              />
                            </div>
                          </div>
                        )}

                        {/* Кнопки */}
                        <div className="flex justify-end space-x-3 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsAddSourceDialogOpen(false);
                              resetForm();
                            }}
                          >
                            Отмена
                          </Button>
                          <Button 
                            onClick={handleSubmitSource}
                            disabled={createSourceMutation.isPending || updateSourceMutation.isPending}
                          >
                            {editingSource 
                              ? (updateSourceMutation.isPending ? 'Сохранение...' : 'Сохранить изменения')
                              : (createSourceMutation.isPending ? 'Создание...' : 'Создать источник')
                            }
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Список источников */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Источники данных ({filteredSources.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sourcesLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Загрузка источников...</p>
                  </div>
                ) : filteredSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Источники данных не найдены</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSources.map((source: DataSource) => (
                      <div key={source.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getSourceTypeIcon(source.type)}
                              <h3 className="font-semibold text-lg">{source.name}</h3>
                              <Badge variant={source.isActive ? "default" : "secondary"}>
                                {source.isActive ? "Активен" : "Неактивен"}
                              </Badge>
                              <Badge variant="outline">{getSourceTypeLabel(source.type)}</Badge>
                            </div>
                            
                            {source.description && (
                              <p className="text-gray-600 mb-3">{source.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {source.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <div className="text-sm text-gray-500">
                              Частота: {source.frequency === 'hourly' ? 'Ежечасно' : source.frequency === 'daily' ? 'Ежедневно' : 'Еженедельно'}
                              {source.lastUpdated && ` • Последнее обновление: ${new Date(source.lastUpdated).toLocaleString('ru-RU')}`}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleSource(source)}
                              disabled={toggleSourceMutation.isPending}
                            >
                              {source.isActive ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewSource(source)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditSource(source)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteSource(source)}
                              disabled={deleteSourceMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Вкладка Пользователи */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Управление пользователями</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Администраторы</div>
                    <div className="text-sm text-gray-600">Полный доступ к системе</div>
                  </div>
                  <Badge variant="default">2 активных</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Зарегистрированные пользователи</div>
                    <div className="text-sm text-gray-600">Доступ к AI чату и аналитике</div>
                  </div>
                  <Badge variant="outline">147 пользователей</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Telegram авторизация</div>
                    <div className="text-sm text-gray-600">Быстрый вход через Telegram</div>
                  </div>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    Активна
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Вкладка Тарифы */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Управление тарифными планами</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pricingPlans.map((plan, index) => (
                    <Card key={plan.id} className={`relative ${plan.popular ? 'border-blue-500 border-2' : 'border-gray-200'}`}>
                      {plan.popular && (
                        <Badge className="absolute -top-2 left-4 bg-blue-500 text-white">
                          Популярный
                        </Badge>
                      )}
                      <CardHeader className="text-center">
                        <Badge className={`mx-auto w-fit ${plan.id === 'basic' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-blue-100 text-blue-700 border-blue-200'} font-medium border`}>
                          {plan.name}
                        </Badge>
                        <div className="mt-4">
                          <div className="text-3xl font-bold text-gray-900">₽{plan.price.toLocaleString()}</div>
                          <div className="text-sm text-gray-600">в {plan.period}</div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ul className="space-y-3">
                          {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{feature.name}:</span>
                              {feature.value ? (
                                <span className="font-medium text-gray-900">{feature.value}</span>
                              ) : (
                                <span className={`text-sm ${feature.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                  {feature.enabled ? '✓' : '✗'}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="flex space-x-2 pt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => {
                              setEditingPlan(plan);
                              setIsEditPlanDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Редактировать
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Вкладка Промокоды */}
        {activeTab === 'promocodes' && (
          <div className="space-y-6">
            {/* Статистика промокодов */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>Статистика промокодов</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">156</div>
                    <div className="text-sm text-gray-600">Всего создано</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">89</div>
                    <div className="text-sm text-gray-600">Использовано</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">12</div>
                    <div className="text-sm text-gray-600">Истекло</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">55</div>
                    <div className="text-sm text-gray-600">Активных</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IP-валидация и безопасность */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Система безопасности IP</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-red-800">Подозрительная активность</div>
                    <div className="text-2xl font-bold text-red-600">3</div>
                    <div className="text-sm text-red-600">IP с превышением лимитов</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-yellow-800">Заблокированные IP</div>
                    <div className="text-2xl font-bold text-yellow-600">8</div>
                    <div className="text-sm text-yellow-600">За последние 24 часа</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold text-green-800">Защищённые операции</div>
                    <div className="text-2xl font-bold text-green-600">98.7%</div>
                    <div className="text-sm text-green-600">Успешность валидации</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Правила безопасности</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="font-medium text-blue-800">Создание промокодов</div>
                      <div className="text-sm text-blue-600">Максимум 3 промокода с одного IP в час</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="font-medium text-blue-800">Использование промокодов</div>
                      <div className="text-sm text-blue-600">Максимум 5 использований с одного IP в день</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="font-medium text-purple-800">Самоприменение</div>
                      <div className="text-sm text-purple-600">Блокировка использования промокода создавшим IP</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium text-gray-800">Временные окна</div>
                      <div className="text-sm text-gray-600">7 дней для применения промокода после регистрации</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Последняя активность */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Последняя IP активность</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { ip: '192.168.1.45', action: 'Создание промокода', code: 'A7B9K2', time: '2 минуты назад', status: 'success' },
                    { ip: '10.0.0.23', action: 'Использование промокода', code: 'M4N8P1', time: '5 минут назад', status: 'success' },
                    { ip: '172.16.0.89', action: 'Попытка создания', code: '-', time: '8 минут назад', status: 'blocked' },
                    { ip: '203.45.67.12', action: 'Использование промокода', code: 'X9Z2L5', time: '12 минут назад', status: 'success' },
                    { ip: '172.16.0.89', action: 'Попытка создания', code: '-', time: '15 минут назад', status: 'blocked' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium">{activity.ip}</div>
                          <div className="text-sm text-gray-600">{activity.action}</div>
                        </div>
                        {activity.code !== '-' && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {activity.code}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{activity.time}</div>
                        <Badge variant={activity.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                          {activity.status === 'success' ? 'Успешно' : 'Заблокировано'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Управление лимитами */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Настройки лимитов</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="creation-limit">Лимит создания промокодов (в час)</Label>
                    <Input 
                      id="creation-limit" 
                      type="number" 
                      defaultValue="3"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usage-limit">Лимит использования промокодов (в день)</Label>
                    <Input 
                      id="usage-limit" 
                      type="number" 
                      defaultValue="5"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration-window">Окно для использования (дни)</Label>
                    <Input 
                      id="registration-window" 
                      type="number" 
                      defaultValue="7"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promocode-lifetime">Время жизни промокода (часы)</Label>
                    <Input 
                      id="promocode-lifetime" 
                      type="number" 
                      defaultValue="24"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Сохранить настройки
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Вкладка Настройки */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Статус ADS API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Статус ADS API</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">Конфигурация:</span>
                    {adsApiStatus?.configured ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Настроен
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="w-4 h-4 mr-1" />
                        Не настроен
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-medium">Доступность:</span>
                    {adsApiStatus?.available ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Подключен
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Недоступен
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-medium">Регионов:</span>
                    <Badge variant="outline">
                      {adsApiStatus?.regions?.length || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Учетные данные ADS API */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>Учетные данные ads-api.ru</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (логин)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={credentials.email}
                      onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Пароль от ads-api.ru"
                      value={credentials.password}
                      onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Синхронизация данных */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5" />
                  <span>Синхронизация недвижимости</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {credentials.email && credentials.password ? (
                  <>
                    {adsApiStatus?.regions && adsApiStatus.regions.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3">Доступные регионы:</h3>
                        <div className="flex flex-wrap gap-2">
                          {adsApiStatus.regions.map((region) => (
                            <Button
                              key={region}
                              variant={selectedRegions.includes(region) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleRegionToggle(region)}
                              className="text-sm"
                            >
                              {region}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="flex space-x-4">
                      <Button
                        onClick={handleSyncAll}
                        disabled={syncMutation.isPending}
                        className="flex items-center space-x-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        <span>{syncMutation.isPending ? 'Синхронизация...' : 'Синхронизировать все'}</span>
                      </Button>

                      {selectedRegions.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={handleSyncSelected}
                          disabled={syncMutation.isPending}
                          className="flex items-center space-x-2"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                          <span>
                            {syncMutation.isPending 
                              ? 'Синхронизация...' 
                              : `Синхронизировать выбранные (${selectedRegions.length})`
                            }
                          </span>
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-blue-800">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Требуется авторизация</span>
                    </div>
                    <p className="text-blue-700 mt-2">
                      Для запуска синхронизации необходимо указать логин и пароль от ads-api.ru
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Системные настройки */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Системные настройки</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">AI модель</div>
                    <div className="text-sm text-gray-600 mb-2">OpenAI GPT-4 для анализа недвижимости</div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Подключена
                    </Badge>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">База данных</div>
                    <div className="text-sm text-gray-600 mb-2">PostgreSQL с расширением PostGIS</div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Активна
                    </Badge>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">Mapbox интеграция</div>
                    <div className="text-sm text-gray-600 mb-2">Интерактивные карты недвижимости</div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Работает
                    </Badge>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="font-medium mb-2">ADS API интеграция</div>
                    <div className="text-sm text-gray-600 mb-2">Автоматическая синхронизация данных</div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Подключена
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Диалог редактирования тарифного плана */}
      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать тарифный план</DialogTitle>
            <DialogDescription>
              Измените параметры тарифного плана "{editingPlan?.name}"
            </DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="plan-name">Название плана</Label>
                <Input
                  id="plan-name"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="plan-price">Цена (руб.)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({...editingPlan, price: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label htmlFor="plan-period">Период</Label>
                <Select 
                  value={editingPlan.period} 
                  onValueChange={(value) => setEditingPlan({...editingPlan, period: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="день">день</SelectItem>
                    <SelectItem value="неделю">неделю</SelectItem>
                    <SelectItem value="месяц">месяц</SelectItem>
                    <SelectItem value="год">год</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Функции плана</Label>
                {editingPlan.features.map((feature: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">{feature.name}</span>
                    {feature.value !== undefined ? (
                      <Input
                        className="w-20 text-right"
                        value={feature.value}
                        onChange={(e) => {
                          const updatedFeatures = [...editingPlan.features];
                          updatedFeatures[index] = {...feature, value: e.target.value};
                          setEditingPlan({...editingPlan, features: updatedFeatures});
                        }}
                      />
                    ) : (
                      <Button
                        variant={feature.enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const updatedFeatures = [...editingPlan.features];
                          updatedFeatures[index] = {...feature, enabled: !feature.enabled};
                          setEditingPlan({...editingPlan, features: updatedFeatures});
                        }}
                      >
                        {feature.enabled ? "Включено" : "Отключено"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => {
                    const updatedPlans = pricingPlans.map(plan => 
                      plan.id === editingPlan.id ? editingPlan : plan
                    );
                    setPricingPlans(updatedPlans);
                    setIsEditPlanDialogOpen(false);
                    toast({
                      title: "Успешно",
                      description: `Тарифный план "${editingPlan.name}" обновлен`
                    });
                  }}
                  className="flex-1"
                >
                  Сохранить изменения
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditPlanDialogOpen(false)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}