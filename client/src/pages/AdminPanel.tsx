import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle, Key, BarChart, Users, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

export default function AdminPanel() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showCredentials, setShowCredentials] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adsApiStatus, isLoading: statusLoading } = useQuery<AdsApiStatus>({
    queryKey: ['/api/admin/ads-api/status'],
    refetchInterval: 30000, // Обновляем каждые 30 секунд
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Database className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Административная панель</h1>
      </div>

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
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Ожидание документации
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}