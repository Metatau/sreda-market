import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  PlusIcon, 
  SearchIcon, 
  EditIcon, 
  TrashIcon, 
  PowerIcon,
  EyeIcon,
  UploadIcon,
  GlobeIcon,
  FileTextIcon,
  MessageSquareIcon,
  DatabaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

const sourceTypeLabels = {
  telegram_channel: 'Telegram канал',
  website: 'Веб-сайт',
  rss_feed: 'RSS лента',
  uploaded_file: 'Загруженный файл',
  spreadsheet: 'Таблица',
  pdf_document: 'PDF документ'
};

const sourceTypeIcons = {
  telegram_channel: MessageSquareIcon,
  website: GlobeIcon,
  rss_feed: DatabaseIcon,
  uploaded_file: FileTextIcon,
  spreadsheet: FileTextIcon,
  pdf_document: FileTextIcon
};

const frequencyLabels = {
  hourly: 'Ежечасно',
  daily: 'Ежедневно',
  weekly: 'Еженедельно'
};

export default function AdminSources() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [previewSource, setPreviewSource] = useState<DataSource | null>(null);

  // Fetch data sources
  const { data: sourcesData, isLoading } = useQuery({
    queryKey: ['/api/admin/sources', { type: typeFilter !== 'all' ? typeFilter : undefined, isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined }]
  });

  const sources = (sourcesData as any)?.data || [];

  // Filter sources based on search term
  const filteredSources = sources.filter((source: DataSource) =>
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/sources/${id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to toggle status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({
        title: 'Успешно',
        description: 'Статус источника изменен'
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус источника',
        variant: 'destructive'
      });
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/sources/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to delete source');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
      toast({
        title: 'Успешно',
        description: 'Источник данных удален'
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить источник данных',
        variant: 'destructive'
      });
    }
  });

  const handleToggleStatus = (source: DataSource) => {
    toggleStatusMutation.mutate(source.id);
  };

  const handleDeleteSource = (source: DataSource) => {
    if (confirm('Вы уверены, что хотите удалить этот источник данных?')) {
      deleteSourceMutation.mutate(source.id);
    }
  };

  const handleEditSource = (source: DataSource) => {
    setEditingSource(source);
    setIsFormOpen(true);
  };

  const handleAddSource = () => {
    setEditingSource(null);
    setIsFormOpen(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: ru });
  };

  const getSourceTypeIcon = (type: string) => {
    const Icon = sourceTypeIcons[type as keyof typeof sourceTypeIcons] || DatabaseIcon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Управление источниками данных
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Настройка и мониторинг источников для сбора аналитических данных
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск источников..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Тип источника" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    {Object.entries(sourceTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="inactive">Неактивные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAddSource} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Добавить источник
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sources Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Источники данных ({filteredSources.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Загрузка источников...</p>
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DatabaseIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Источники данных не найдены</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Источник</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Частота</TableHead>
                    <TableHead>Последнее обновление</TableHead>
                    <TableHead>Теги</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSources.map((source: DataSource) => (
                    <TableRow key={source.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{source.name}</div>
                          {source.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {source.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSourceTypeIcon(source.type)}
                          <span className="text-sm">
                            {sourceTypeLabels[source.type as keyof typeof sourceTypeLabels]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={source.isActive ? 'default' : 'secondary'}>
                          {source.isActive ? (
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircleIcon className="h-3 w-3 mr-1" />
                          )}
                          {source.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {frequencyLabels[source.frequency as keyof typeof frequencyLabels]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {source.lastUpdated ? formatDate(source.lastUpdated) : 'Никогда'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-32">
                          {source.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {source.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{source.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewSource(source)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSource(source)}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(source)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            <PowerIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSource(source)}
                            disabled={deleteSourceMutation.isPending}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Form Dialog */}
      <SourceFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        source={editingSource}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingSource(null);
          queryClient.invalidateQueries({ queryKey: ['/api/admin/sources'] });
        }}
      />

      {/* Source Preview Dialog */}
      <SourcePreviewDialog
        source={previewSource}
        onClose={() => setPreviewSource(null)}
      />
    </div>
  );
}

// Source Form Dialog Component
function SourceFormDialog({ isOpen, onClose, source, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  source: DataSource | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'website',
    config: {},
    tags: [] as string[],
    frequency: 'daily'
  });
  const [tagInput, setTagInput] = useState('');

  React.useEffect(() => {
    if (source) {
      setFormData({
        name: source.name,
        description: source.description || '',
        type: source.type,
        config: source.config,
        tags: source.tags,
        frequency: source.frequency
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'website',
        config: {},
        tags: [],
        frequency: 'daily'
      });
    }
  }, [source]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = source ? `/api/admin/sources/${source.id}` : '/api/admin/sources';
      const method = source ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save source');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Успешно',
        description: source ? 'Источник обновлен' : 'Источник создан'
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить источник',
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {source ? 'Редактировать источник' : 'Добавить источник'}
          </DialogTitle>
          <DialogDescription>
            Настройте параметры источника данных для сбора аналитической информации
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название источника</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Введите название источника"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Опишите назначение источника"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="type">Тип источника</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value, config: {} }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="frequency">Частота сбора</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source-specific configuration */}
            <SourceConfigForm 
              type={formData.type}
              config={formData.config}
              onChange={(config) => setFormData(prev => ({ ...prev, config }))}
            />

            {/* Tags */}
            <div>
              <Label>Теги</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Добавить тег"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Добавить
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Source Config Form Component
function SourceConfigForm({ type, config, onChange }: {
  type: string;
  config: any;
  onChange: (config: any) => void;
}) {
  const updateConfig = (updates: any) => {
    onChange({ ...config, ...updates });
  };

  switch (type) {
    case 'website':
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="websiteUrl">URL веб-сайта</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={config.websiteUrl || ''}
              onChange={(e) => updateConfig({ websiteUrl: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <Label htmlFor="cssSelectors">CSS селекторы (через запятую)</Label>
            <Input
              id="cssSelectors"
              value={config.cssSelectors?.join(', ') || ''}
              onChange={(e) => updateConfig({ 
                cssSelectors: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder=".article-title, .content, .date"
            />
          </div>
        </div>
      );

    case 'telegram_channel':
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="channelUrl">URL канала</Label>
            <Input
              id="channelUrl"
              value={config.channelUrl || ''}
              onChange={(e) => updateConfig({ channelUrl: e.target.value })}
              placeholder="https://t.me/channel_name"
            />
          </div>
          <div>
            <Label htmlFor="channelUsername">Username канала</Label>
            <Input
              id="channelUsername"
              value={config.channelUsername || ''}
              onChange={(e) => updateConfig({ channelUsername: e.target.value })}
              placeholder="@channel_name"
            />
          </div>
        </div>
      );

    case 'rss_feed':
      return (
        <div>
          <Label htmlFor="rssUrl">URL RSS ленты</Label>
          <Input
            id="rssUrl"
            type="url"
            value={config.rssUrl || ''}
            onChange={(e) => updateConfig({ rssUrl: e.target.value })}
            placeholder="https://example.com/rss.xml"
          />
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          Дополнительные настройки для типа "{sourceTypeLabels[type as keyof typeof sourceTypeLabels]}" будут добавлены позже.
        </div>
      );
  }
}

// Source Preview Dialog Component
function SourcePreviewDialog({ source, onClose }: {
  source: DataSource | null;
  onClose: () => void;
}) {
  const { data: previewData } = useQuery({
    queryKey: ['/api/admin/sources', source?.id, 'preview'],
    enabled: !!source
  });

  const preview = (previewData as any)?.data;

  return (
    <Dialog open={!!source} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Предпросмотр источника: {source?.name}</DialogTitle>
          <DialogDescription>
            Просмотр данных и статистики источника
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Последнее обновление</div>
                  <div className="font-medium">
                    {preview.lastUpdate ? format(new Date(preview.lastUpdate), 'dd.MM.yyyy HH:mm', { locale: ru }) : 'Никогда'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-gray-500">Количество элементов</div>
                  <div className="font-medium">{preview.itemsCount}</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-medium mb-3">Примеры данных:</h4>
              <div className="space-y-2">
                {preview.sampleItems?.map((item: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-gray-500">{format(new Date(item.date), 'dd.MM.yyyy HH:mm', { locale: ru })}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Загрузка предпросмотра...</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Закрыть</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}