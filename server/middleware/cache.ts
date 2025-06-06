
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { LRUCache } from 'lru-cache';

// In-memory cache for API responses
const apiResponseCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
});

// Cache performance metrics
interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

let cacheStats = { hits: 0, misses: 0 };

export function getCacheMetrics(): CacheMetrics {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    size: apiResponseCache.size,
    hitRate: total > 0 ? (cacheStats.hits / total) * 100 : 0
  };
}

export function cacheControl(maxAge: number = 300, type: 'static' | 'dynamic' | 'api' = 'static') {
  return (req: Request, res: Response, next: NextFunction) => {
    switch (type) {
      case 'static':
        res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
        break;
      case 'dynamic':
        res.setHeader('Cache-Control', `public, max-age=${maxAge}, must-revalidate`);
        break;
      case 'api':
        res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=60`);
        break;
    }
    next();
  };
}

export function responseCacheMiddleware(ttl: number = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.originalUrl || req.url}_${JSON.stringify(req.query)}`;
    const cached = apiResponseCache.get(cacheKey);

    if (cached) {
      cacheStats.hits++;
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      return res.json(cached);
    }

    cacheStats.misses++;
    
    const originalJson = res.json;
    res.json = function(data) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiResponseCache.set(cacheKey, data, { ttl: ttl * 1000 });
      }
      
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      return originalJson.call(this, data);
    };

    next();
  };
}

export function etag(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data) {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    
    res.setHeader('ETag', `"${hash}"`);
    
    if (req.headers['if-none-match'] === `"${hash}"`) {
      return res.status(304).end();
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

export function compression(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data) {
    const jsonString = JSON.stringify(data);
    const size = Buffer.byteLength(jsonString, 'utf8');
    
    // Add response size headers
    res.setHeader('X-Response-Size', size.toString());
    res.setHeader('Content-Length', size.toString());
    
    // Enable compression for responses larger than 1KB
    if (size > 1024) {
      res.setHeader('X-Should-Compress', 'true');
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

export function clearCache(): void {
  apiResponseCache.clear();
  cacheStats = { hits: 0, misses: 0 };
}
