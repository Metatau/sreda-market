import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Zap, 
  Database, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface PerformanceMetrics {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  requests: {
    total: number;
    byEndpoint: Record<string, number>;
    byStatus: Record<string, number>;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  averageResponseTime: number;
  slowestEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    requestCount: number;
  }>;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  uptime: number;
  memoryUsage: number;
  averageResponseTime: number;
  cacheHitRate: number;
  timestamp: string;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      const [metricsRes, healthRes] = await Promise.all([
        fetch('/api/admin/performance/metrics'),
        fetch('/api/admin/performance/health')
      ]);

      if (metricsRes.ok && healthRes.ok) {
        const metricsData = await metricsRes.json();
        const healthData = await healthRes.json();
        
        setMetrics(metricsData.data);
        setHealth(healthData.data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearCache = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/performance/clear-cache', {
        method: 'POST'
      });
      
      if (response.ok) {
        await fetchMetrics();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      setRefreshing(false);
    }
  };

  const resetMetrics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/performance/reset', {
        method: 'POST'
      });
      
      if (response.ok) {
        await fetchMetrics();
      }
    } catch (error) {
      console.error('Error resetting metrics:', error);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка метрик производительности...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Мониторинг производительности</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            disabled={refreshing}
          >
            <Database className="w-4 h-4 mr-2" />
            Очистить кэш
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetMetrics}
            disabled={refreshing}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Сбросить метрики
          </Button>
        </div>
      </div>

      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getStatusIcon(health.status)}
              <span>Состояние системы</span>
              <Badge className={getStatusColor(health.status)}>
                {health.status === 'healthy' ? 'Здоровая' : 
                 health.status === 'warning' ? 'Предупреждение' : 'Критическое'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Время работы</p>
                <p className="text-lg font-semibold">{formatUptime(health.uptime)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Использование памяти</p>
                <p className="text-lg font-semibold">{health.memoryUsage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Среднее время ответа</p>
                <p className="text-lg font-semibold">{Math.round(health.averageResponseTime)}ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Попадания в кэш</p>
                <p className="text-lg font-semibold">{Math.round(health.cacheHitRate)}%</p>
              </div>
            </div>
            
            {health.issues.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">Обнаруженные проблемы:</p>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {health.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {metrics && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="memory">Память</TabsTrigger>
            <TabsTrigger value="cache">Кэш</TabsTrigger>
            <TabsTrigger value="endpoints">Эндпоинты</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Всего запросов</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.requests.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Среднее время ответа</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(metrics.averageResponseTime)}ms</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Эффективность кэша</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(metrics.cache.hitRate)}%</div>
                  <Progress value={metrics.cache.hitRate} className="mt-2" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Использование памяти</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Heap Used</span>
                      <span>{formatBytes(metrics.memory.heapUsed)} / {formatBytes(metrics.memory.heapTotal)}</span>
                    </div>
                    <Progress 
                      value={(metrics.memory.heapUsed / metrics.memory.heapTotal) * 100} 
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">RSS</p>
                      <p className="font-semibold">{formatBytes(metrics.memory.rss)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">External</p>
                      <p className="font-semibold">{formatBytes(metrics.memory.external)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cache" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Статистика кэша</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Попадания</span>
                      <span className="font-semibold text-green-600">{metrics.cache.hits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Промахи</span>
                      <span className="font-semibold text-red-600">{metrics.cache.misses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Размер кэша</span>
                      <span className="font-semibold">{metrics.cache.size} элементов</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Эффективность</span>
                      <span className="font-semibold">{Math.round(metrics.cache.hitRate)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Самые медленные эндпоинты</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.slowestEndpoints.slice(0, 10).map((endpoint, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-mono">{endpoint.endpoint}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{Math.round(endpoint.averageTime)}ms</span>
                        <span className="text-xs text-gray-500 ml-2">({endpoint.requestCount} запросов)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}