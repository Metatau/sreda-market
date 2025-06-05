import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Database, CheckCircle, XCircle, AlertCircle, Key } from "lucide-react";
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
                  Доступен
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
                  ? "API настроен, но для синхронизации требуется активная подписка на ads-api.ru. Обратитесь к support@ads-api.ru для активации доступа к API."
                  : "Для запуска синхронизации необходимо указать логин и пароль от ads-api.ru в форме выше."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}