import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Search, Filter, Eye, Edit, Trash2, Play, Square, CheckCircle, XCircle, Calendar, Globe, FileText, MessageSquare, Upload, Database } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showCredentials, setShowCredentials] = useState(false);
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
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [pricingPlans] = useState([
    {
      id: 'basic',
      name: 'Базовый',
      price: 0,
      period: 'месяц',
      popular: false,
      features: [
        { name: 'AI-запросов/день', value: '5' },
        { name: 'Поиск объектов', enabled: true },
        { name: 'Карта районов', enabled: true },
        { name: 'Базовая аналитика', enabled: true },
        { name: 'Экспорт в PDF', enabled: false }
      ]
    },
    {
      id: 'premium',
      name: 'Премиум',
      price: 2990,
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
  const [filterType, setFilterType] = useState('');

  console.log('Form state:', newSourceForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adsApiStatus, isLoading: statusLoading } = useQuery<AdsApiStatus>({
    queryKey: ['/api/admin/ads-api/status'],
    enabled: activeTab === 'sync' && isAuthenticated && user?.roles?.includes('admin')
  });

  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['/api/admin/sources'],
    enabled: activeTab === 'sources' && isAuthenticated && user?.roles?.includes('admin')
  });

  // Filter sources based on search and type
  const filteredSources = useMemo(() => {
    if (!sourcesData?.data) return [];
    return sourcesData.data.filter((source: DataSource) => {
      const matchesSearch = !sourcesSearchTerm || 
        source.name.toLowerCase().includes(sourcesSearchTerm.toLowerCase()) ||
        source.description?.toLowerCase().includes(sourcesSearchTerm.toLowerCase());
      const matchesType = !filterType || source.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [sourcesData?.data, sourcesSearchTerm, filterType]);

  // Мутации для источников данных
  const toggleSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/sources/${id}/toggle`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Статус источника изменен' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/sources/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({ title: 'Успешно', description: 'Источник данных удален' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  const createSourceMutation = useMutation({
    mutationFn: async (sourceData: any) => {
      const url = editingSource ? `/api/admin/sources/${editingSource.id}` : '/api/admin/sources';
      const method = editingSource ? 'PUT' : 'POST';
      return await apiRequest(url, { method, body: sourceData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      setIsAddSourceDialogOpen(false);
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
      toast({ 
        title: 'Успешно', 
        description: editingSource ? 'Источник данных обновлен' : 'Источник данных создан' 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async ({ regions, credentials }: { regions: string[], credentials: any }) => {
      return await apiRequest('/api/admin/scheduler/sync', {
        method: 'POST',
        body: { regions, credentials }
      });
    },
    onSuccess: (data: SyncResult) => {
      toast({
        title: 'Синхронизация завершена',
        description: `Импортировано: ${data.imported}, обновлено: ${data.updated}`,
      });
      setShowCredentials(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка синхронизации',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleSync = () => {
    if (!adsApiStatus?.configured && (!credentials.username || !credentials.password)) {
      toast({
        title: 'Требуются учетные данные',
        description: 'Введите логин и пароль для доступа к ADS API',
        variant: 'destructive',
      });
      setShowCredentials(true);
      return;
    }
    syncMutation.mutate({ regions: selectedRegions, credentials });
  };

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
      tags: source.tags.join(', '),
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

  const handleCreateSource = () => {
    const tags = newSourceForm.tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const config = { ...newSourceForm.config };
    
    if (config.keywords) {
      config.keywords = config.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
    }

    const sourceData = {
      name: newSourceForm.name,
      description: newSourceForm.description,
      type: newSourceForm.type,
      frequency: newSourceForm.frequency,
      tags,
      config
    };

    createSourceMutation.mutate(sourceData);
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'website': return <Globe className="h-4 w-4" />;
      case 'telegram': return <MessageSquare className="h-4 w-4" />;
      case 'rss': return <FileText className="h-4 w-4" />;
      case 'file': return <Upload className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'website': return 'Веб-сайт';
      case 'telegram': return 'Telegram';
      case 'rss': return 'RSS';
      case 'file': return 'Файл';
      case 'database': return 'База данных';
      default: return type;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'hourly': return 'Каждый час';
      case 'daily': return 'Ежедневно';
      case 'weekly': return 'Еженедельно';
      case 'monthly': return 'Ежемесячно';
      default: return frequency;
    }
  };

  const renderSourceConfigFields = () => {
    switch (newSourceForm.type) {
      case 'website':
        return (
          <div className="space-y-4">
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
            <div>
              <Label htmlFor="keywords">Ключевые слова (через запятую)</Label>
              <Input
                id="keywords"
                value={newSourceForm.config.keywords}
                onChange={(e) => setNewSourceForm(prev => ({
                  ...prev,
                  config: { ...prev.config, keywords: e.target.value }
                }))}
                placeholder="недвижимость, инвестиции, рынок"
              />
            </div>
          </div>
        );
      case 'telegram':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="channelUrl">URL канала</Label>
              <Input
                id="channelUrl"
                value={newSourceForm.config.channelUrl}
                onChange={(e) => setNewSourceForm(prev => ({
                  ...prev,
                  config: { ...prev.config, channelUrl: e.target.value }
                }))}
                placeholder="https://t.me/channelname"
              />
            </div>
            <div>
              <Label htmlFor="channelUsername">Имя канала</Label>
              <Input
                id="channelUsername"
                value={newSourceForm.config.channelUsername}
                onChange={(e) => setNewSourceForm(prev => ({
                  ...prev,
                  config: { ...prev.config, channelUsername: e.target.value }
                }))}
                placeholder="@channelname"
              />
            </div>
          </div>
        );
      case 'rss':
        return (
          <div>
            <Label htmlFor="rssUrl">RSS URL</Label>
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
        );
      case 'file':
        return (
          <div>
            <Label htmlFor="fileName">Имя файла</Label>
            <Input
              id="fileName"
              value={newSourceForm.config.fileName}
              onChange={(e) => setNewSourceForm(prev => ({
                ...prev,
                config: { ...prev.config, fileName: e.target.value }
              }))}
              placeholder="data.json"
            />
          </div>
        );
      default:
        return {};
    }
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.roles?.includes('admin')) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Доступ запрещен</h1>
          <p>У вас нет прав для доступа к панели администратора.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-7xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Панель администратора</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Управление системой и источниками данных
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            Обзор
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            Источники
          </TabsTrigger>
          <TabsTrigger value="sync" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            Синхронизация
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            Тарифы
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Системная информация</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Статус API:</span>
                    <Badge variant={adsApiStatus?.available ? 'default' : 'destructive'}>
                      {adsApiStatus?.available ? 'Доступен' : 'Недоступен'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Регионы:</span>
                    <span>{adsApiStatus?.regions?.length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Источники данных</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Всего:</span>
                    <span>{sourcesData?.data?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Активных:</span>
                    <span>{sourcesData?.data?.filter((s: DataSource) => s.isActive).length || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
            <h2 className="text-xl sm:text-2xl font-semibold">Источники данных</h2>
            <Dialog open={isAddSourceDialogOpen} onOpenChange={setIsAddSourceDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить источник
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {editingSource ? 'Редактировать источник' : 'Добавить новый источник'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Название</Label>
                      <Input
                        id="name"
                        value={newSourceForm.name}
                        onChange={(e) => setNewSourceForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Название источника"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Тип</Label>
                      <Select
                        value={newSourceForm.type}
                        onValueChange={(value) => setNewSourceForm(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="website">Веб-сайт</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                          <SelectItem value="rss">RSS</SelectItem>
                          <SelectItem value="file">Файл</SelectItem>
                          <SelectItem value="database">База данных</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Textarea
                      id="description"
                      value={newSourceForm.description}
                      onChange={(e) => setNewSourceForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Описание источника данных"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="frequency">Частота обновления</Label>
                      <Select
                        value={newSourceForm.frequency}
                        onValueChange={(value) => setNewSourceForm(prev => ({ ...prev, frequency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Каждый час</SelectItem>
                          <SelectItem value="daily">Ежедневно</SelectItem>
                          <SelectItem value="weekly">Еженедельно</SelectItem>
                          <SelectItem value="monthly">Ежемесячно</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tags">Теги (через запятую)</Label>
                      <Input
                        id="tags"
                        value={newSourceForm.tags}
                        onChange={(e) => setNewSourceForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="новости, аналитика, рынок"
                      />
                    </div>
                  </div>

                  {renderSourceConfigFields()}

                  <div className="flex flex-col sm:flex-row gap-2 pt-4">
                    <Button 
                      onClick={handleCreateSource} 
                      disabled={createSourceMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {createSourceMutation.isPending ? 'Сохранение...' : 
                       editingSource ? 'Обновить' : 'Создать'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddSourceDialogOpen(false);
                        setEditingSource(null);
                      }}
                      className="w-full sm:w-auto"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Поиск источников..."
                value={sourcesSearchTerm}
                onChange={(e) => setSourcesSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Все типы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="website">Веб-сайт</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="rss">RSS</SelectItem>
                <SelectItem value="file">Файл</SelectItem>
                <SelectItem value="database">База данных</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sourcesLoading ? (
            <div className="text-center py-8">
              <div className="text-lg">Загрузка источников...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSources.length > 0 ? (
                filteredSources.map((source: DataSource) => (
                  <Card key={source.id} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          {getSourceTypeIcon(source.type)}
                          <h3 className="font-semibold text-lg">{source.name}</h3>
                          <Badge variant={source.isActive ? 'default' : 'secondary'}>
                            {source.isActive ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </div>
                        {source.description && (
                          <p className="text-sm text-muted-foreground">{source.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>{getSourceTypeLabel(source.type)}</span>
                          <span>•</span>
                          <span>{getFrequencyLabel(source.frequency)}</span>
                          {source.lastUpdated && (
                            <>
                              <span>•</span>
                              <span>Обновлен: {new Date(source.lastUpdated).toLocaleString('ru-RU')}</span>
                            </>
                          )}
                        </div>
                        {source.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {source.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
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
                          onClick={() => handleToggleSource(source)}
                          disabled={toggleSourceMutation.isPending}
                        >
                          {source.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[95vw] max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить источник?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Вы уверены, что хотите удалить источник "{source.name}"? 
                                Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto">Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSource(source)}
                                className="w-full sm:w-auto"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Источники данных не найдены</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sync" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Синхронизация данных</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Выберите регионы для синхронизации:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {adsApiStatus?.regions?.map((region: string) => (
                      <label key={region} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedRegions.includes(region)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRegions([...selectedRegions, region]);
                            } else {
                              setSelectedRegions(selectedRegions.filter(r => r !== region));
                            }
                          }}
                        />
                        <span className="text-sm">{region}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {showCredentials && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-medium">Учетные данные ADS API</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">Логин</Label>
                        <Input
                          id="username"
                          value={credentials.username}
                          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Пароль</Label>
                        <Input
                          id="password"
                          type="password"
                          value={credentials.password}
                          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleSync} 
                  disabled={syncMutation.isPending || selectedRegions.length === 0}
                  className="w-full sm:w-auto"
                >
                  {syncMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Синхронизация...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Запустить синхронизацию
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {pricingPlans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Популярный</Badge>
                  </div>
                )}
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {plan.price === 0 ? 'Бесплатно' : `₽${plan.price.toLocaleString()}`}
                    {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <span>{feature.name}</span>
                        {feature.value ? (
                          <Badge variant="outline">{feature.value}</Badge>
                        ) : (
                          <div className={`h-4 w-4 rounded-full ${feature.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        )}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => setEditingPlan(plan)}
                  >
                    Редактировать
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}