import { Request, Response, NextFunction } from 'express';
import { getCacheMetrics, clearCache } from '../middleware/cache';

interface PerformanceMetrics {
  responseTime: number;
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  memoryUsage: NodeJS.MemoryUsage;
  cacheHit: boolean;
}

interface SystemMetrics {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: any;
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

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private requestCounts: Record<string, number> = {};
  private responseTimes: Record<string, number[]> = {};
  private statusCounts: Record<string, number> = {};
  private maxMetricsHistory = 1000;

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      // Capture original end function
      const originalEnd = res.end;
      const originalJson = res.json;

      res.end = function(chunk?: any, encoding?: BufferEncoding, cb?: () => void) {
        recordMetrics();
        return originalEnd.call(this, chunk, encoding, cb);
      };

      res.json = function(data) {
        recordMetrics();
        return originalJson.call(this, data);
      };

      const recordMetrics = () => {
        const responseTime = Date.now() - startTime;
        const endpoint = req.route?.path || req.path;
        const method = req.method;
        const statusCode = res.statusCode;
        const cacheHit = res.getHeader('X-Cache') === 'HIT';

        // Store metrics
        performanceMonitor.addMetric({
          responseTime,
          timestamp: Date.now(),
          endpoint,
          method,
          statusCode,
          memoryUsage: process.memoryUsage(),
          cacheHit
        });

        // Update counters
        const endpointKey = `${method} ${endpoint}`;
        performanceMonitor.incrementRequestCount(endpointKey);
        performanceMonitor.addResponseTime(endpointKey, responseTime);
        performanceMonitor.incrementStatusCount(statusCode.toString());
      };

      next();
    };
  }

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  incrementRequestCount(endpoint: string) {
    this.requestCounts[endpoint] = (this.requestCounts[endpoint] || 0) + 1;
  }

  addResponseTime(endpoint: string, time: number) {
    if (!this.responseTimes[endpoint]) {
      this.responseTimes[endpoint] = [];
    }
    this.responseTimes[endpoint].push(time);
    
    // Keep only recent response times
    if (this.responseTimes[endpoint].length > 100) {
      this.responseTimes[endpoint] = this.responseTimes[endpoint].slice(-100);
    }
  }

  incrementStatusCount(status: string) {
    this.statusCounts[status] = (this.statusCounts[status] || 0) + 1;
  }

  getMetrics(): SystemMetrics {
    const cacheMetrics = getCacheMetrics();
    
    // Calculate average response time
    const allResponseTimes = this.metrics.map(m => m.responseTime);
    const averageResponseTime = allResponseTimes.length > 0 
      ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length 
      : 0;

    // Calculate slowest endpoints
    const slowestEndpoints = Object.entries(this.responseTimes)
      .map(([endpoint, times]) => ({
        endpoint,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        requestCount: this.requestCounts[endpoint] || 0
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      requests: {
        total: Object.values(this.requestCounts).reduce((a, b) => a + b, 0),
        byEndpoint: { ...this.requestCounts },
        byStatus: { ...this.statusCounts }
      },
      cache: cacheMetrics,
      averageResponseTime,
      slowestEndpoints
    };
  }

  getDetailedMetrics(endpoint?: string) {
    let filteredMetrics = this.metrics;
    
    if (endpoint) {
      filteredMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    }

    return {
      metrics: filteredMetrics.slice(-100), // Last 100 requests
      summary: {
        totalRequests: filteredMetrics.length,
        averageResponseTime: filteredMetrics.length > 0 
          ? filteredMetrics.reduce((a, b) => a + b.responseTime, 0) / filteredMetrics.length 
          : 0,
        cacheHitRate: filteredMetrics.length > 0 
          ? (filteredMetrics.filter(m => m.cacheHit).length / filteredMetrics.length) * 100 
          : 0,
        errorRate: filteredMetrics.length > 0 
          ? (filteredMetrics.filter(m => m.statusCode >= 400).length / filteredMetrics.length) * 100 
          : 0
      }
    };
  }

  reset() {
    this.metrics = [];
    this.requestCounts = {};
    this.responseTimes = {};
    this.statusCounts = {};
  }

  optimizeCache() {
    clearCache();
    return { message: 'Cache cleared successfully', timestamp: new Date().toISOString() };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const memory = process.memoryUsage();
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    
    let status = 'healthy';
    const issues = [];

    if (memoryUsagePercent > 80) {
      status = 'warning';
      issues.push('High memory usage');
    }

    if (metrics.averageResponseTime > 1000) {
      status = 'warning';
      issues.push('Slow response times');
    }

    if (metrics.cache.hitRate < 50 && metrics.requests.total > 100) {
      status = 'warning';
      issues.push('Low cache hit rate');
    }

    return {
      status,
      issues,
      uptime: metrics.uptime,
      memoryUsage: Math.round(memoryUsagePercent),
      averageResponseTime: Math.round(metrics.averageResponseTime),
      cacheHitRate: Math.round(metrics.cache.hitRate),
      timestamp: new Date().toISOString()
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();