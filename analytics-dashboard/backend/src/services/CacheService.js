import redis from 'redis';
import { logger } from '../utils/logger.js';

export class CacheService {
  constructor(config = {}) {
    this.defaultTTL = config.defaultTTL || 300; // 5 minutes
    this.connected = false;
    this.memoryCache = new Map(); // In-memory fallback for development
    
    // Only try Redis if not explicitly disabled
    if (process.env.ENABLE_CACHING !== 'false') {
      this.client = redis.createClient(config);
      this.setupRedis();
    } else {
      logger.info('Redis disabled, using in-memory cache for development');
      this.connected = true; // Use memory cache as "connected"
    }
  }

  setupRedis() {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.connected = true;
    });

    this.client.on('error', (error) => {
      logger.warn('Redis client error, falling back to memory cache:', error.message);
      this.connected = false;
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
      this.connected = false;
    });

    // Connect to Redis
    this.client.connect().catch(error => {
      logger.warn('Failed to connect to Redis, using memory cache:', error.message);
      this.connected = false;
    });
  }

  async get(key) {
    try {
      // Try Redis first if connected
      if (this.connected && this.client) {
        const value = await this.client.get(key);
        if (value) {
          return JSON.parse(value);
        }
      }
      
      // Fall back to memory cache
      const cached = this.memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      } else if (cached) {
        this.memoryCache.delete(key);
      }
      
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = null) {
    try {
      const ttl = ttlSeconds || this.defaultTTL;
      
      // Try Redis first if connected
      if (this.connected && this.client) {
        const serialized = JSON.stringify(value);
        await this.client.setEx(key, ttl, serialized);
      }
      
      // Always store in memory cache as fallback
      this.memoryCache.set(key, {
        value,
        expires: Date.now() + (ttl * 1000)
      });
      
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      
      // Still try memory cache
      this.memoryCache.set(key, {
        value,
        expires: Date.now() + ((ttlSeconds || this.defaultTTL) * 1000)
      });
      
      return false;
    }
  }

  async del(key) {
    try {
      if (this.connected && this.client) {
        await this.client.del(key);
      }
      
      this.memoryCache.delete(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (this.connected && this.client) {
        const result = await this.client.exists(key);
        return result === 1;
      }
      
      const cached = this.memoryCache.get(key);
      return cached && cached.expires > Date.now();
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  async flush() {
    try {
      if (this.connected && this.client) {
        await this.client.flushAll();
      }
      
      this.memoryCache.clear();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache pattern methods
  async getOrSet(key, fetchFunction, ttlSeconds = null) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch the data
      const data = await fetchFunction();
      
      // Store in cache
      await this.set(key, data, ttlSeconds);
      
      return data;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      
      // If cache fails, still try to fetch the data
      try {
        return await fetchFunction();
      } catch (fetchError) {
        logger.error(`Fetch function failed for key ${key}:`, fetchError);
        throw fetchError;
      }
    }
  }

  // Health check
  isHealthy() {
    return true; // Always healthy with memory cache fallback
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        logger.info('Redis client disconnected gracefully');
      }
      this.memoryCache.clear();
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  // Cache key generators for consistency
  static keys = {
    userAnalytics: (address) => `user:analytics:${address.toLowerCase()}`,
    providerAnalytics: (address) => `provider:analytics:${address.toLowerCase()}`,
    globalMetrics: () => 'metrics:global',
    dailyMetrics: (startDate, endDate) => `metrics:daily:${startDate}:${endDate}`,
    topProviders: (limit) => `providers:top:${limit}`,
    topUsers: (limit) => `users:top:${limit}`,
    paymentFlows: (userAddress, providerAddress) => {
      const user = userAddress ? userAddress.toLowerCase() : 'all';
      const provider = providerAddress ? providerAddress.toLowerCase() : 'all';
      return `flows:${user}:${provider}`;
    },
    recentPayments: (limit) => `payments:recent:${limit}`,
    paymentTrends: (days) => `trends:payments:${days}`,
    aiInsights: () => 'insights:ai:current'
  };
}