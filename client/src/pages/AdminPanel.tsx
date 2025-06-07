import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle, Key, BarChart, Users, Settings, Globe, MessageSquare, FileText, Plus, Search, ToggleLeft, ToggleRight, Eye, Edit, Trash2, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";

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
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showCredentials, setShowCredentials] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sourcesSearchTerm, setSourcesSearchTerm] = useState('');
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [newSourceForm, setNewSourceForm] = useState({
    name: '',
    description: '',
    type: '',
    frequency: 'daily',
    tags: '',
    config: {
      websiteUrl: '',
      channelUrl: '',
      rssUrl: '',
      fileName: '',
      keywords: ''
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adsApiStatus, isLoading: statusLoading } = useQuery<AdsApiStatus>({
    queryKey: ['/api/admin/ads-api/status'],
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['/api/admin/sources'],
    enabled: activeTab === 'sources'
  });

  const sources = (sourcesData as any)?.data || [];

  // Фильтрация источников данных
  const filteredSources = sources.filter((source: DataSource) =>
    source.name.toLowerCase().includes(sourcesSearchTerm.toLowerCase()) ||
    source.description?.toLowerCase().includes(sourcesSearchTerm.toLowerCase()) ||
    source.tags.some(tag => tag.toLowerCase().includes(sourcesSearchTerm.toLowerCase()))
  );

  // Мутации для источников данных
  const toggleSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/sources/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to toggle source');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Статус источника изменен' });
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/sources/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete source');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Источник удален' });
    }
  });

  const createSourceMutation = useMutation({
    mutationFn: async (sourceData: any) => {
      const response = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create source');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Источник создан' });
      setIsAddSourceDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Ошибка', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (params: { regions?: string[]; credentials?: { email: string; password: string } }) => {
      const response = await apiRequest('POST', '/api/admin/ads-api/sync', params);
      return response.json();
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
    setNewSourceForm({
      name: '',
      description: '',
      type: '',
      frequency: 'daily',
      tags: '',
      config: {
        websiteUrl: '',
        channelUrl: '',
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

    const sourceData = {
      name: newSourceForm.name,
      description: newSourceForm.description || undefined,
      type: newSourceForm.type,
      frequency: newSourceForm.frequency,
      tags: newSourceForm.tags ? newSourceForm.tags.split(',').map(tag => tag.trim()) : [],
      config: getConfigForType(newSourceForm.type)
    };

    createSourceMutation.mutate(sourceData);
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
                        <DialogTitle>Добавить новый источник данных</DialogTitle>
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
                            <Select value={newSourceForm.type} onValueChange={(value) => setNewSourceForm(prev => ({ ...prev, type: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите тип источника" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="website">Веб-сайт</SelectItem>
                                <SelectItem value="telegram_channel">Telegram канал</SelectItem>
                                <SelectItem value="rss_feed">RSS лента</SelectItem>
                                <SelectItem value="uploaded_file">Загруженный файл</SelectItem>
                                <SelectItem value="spreadsheet">Таблица</SelectItem>
                                <SelectItem value="pdf_document">PDF документ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="frequency">Частота обновления</Label>
                            <Select value={newSourceForm.frequency} onValueChange={(value) => setNewSourceForm(prev => ({ ...prev, frequency: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hourly">Ежечасно</SelectItem>
                                <SelectItem value="daily">Ежедневно</SelectItem>
                                <SelectItem value="weekly">Еженедельно</SelectItem>
                              </SelectContent>
                            </Select>
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
                            disabled={createSourceMutation.isPending}
                          >
                            {createSourceMutation.isPending ? 'Создание...' : 'Создать источник'}
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
                            
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button variant="outline" size="sm">
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
    </div>
  );
}