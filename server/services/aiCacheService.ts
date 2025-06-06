import { createHash } from 'crypto';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class AICacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private generateKey(input: string, context?: any): string {
    const contextStr = context ? JSON.stringify(context) : '';
    const combined = `${input}${contextStr}`;
    return createHash('md5').update(combined).digest('hex');
  }

  get(input: string, context?: any): any | null {
    const key = this.generateKey(input, context);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(input: string, data: any, context?: any, ttlMs?: number): void {
    const key = this.generateKey(input, context);
    const ttl = ttlMs || this.DEFAULT_TTL;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  has(input: string, context?: any): boolean {
    const key = this.generateKey(input, context);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; memoryUsage: number } {
    let memoryUsage = 0;
    this.cache.forEach(entry => {
      memoryUsage += JSON.stringify(entry).length;
    });
    
    return {
      size: this.cache.size,
      memoryUsage
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

export const aiCacheService = new AICacheService();

// Cleanup on process exit
process.on('SIGTERM', () => aiCacheService.destroy());
process.on('SIGINT', () => aiCacheService.destroy());