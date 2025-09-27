import { RateLimiterRedis } from 'rate-limiter-flexible';
import { logger } from '../utils/logger.js';

// Create rate limiters for different endpoints
const rateLimiters = {
  // General API endpoints
  general: new RateLimiterRedis({
    storeClient: null, // Will be set when Redis is available
    keyPrefix: 'rl_general',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  }),
  
  // Analytics endpoints (more lenient)
  analytics: new RateLimiterRedis({
    storeClient: null,
    keyPrefix: 'rl_analytics',
    points: 50,
    duration: 60,
    blockDuration: 30,
  }),
  
  // AI insights endpoints (more restrictive)
  ai: new RateLimiterRedis({
    storeClient: null,
    keyPrefix: 'rl_ai',
    points: 10,
    duration: 60,
    blockDuration: 120,
  })
};

// Fallback in-memory rate limiter when Redis is not available
const memoryRateLimiter = new Map();

function getClientKey(req) {
  // Use IP address and user-agent as key
  return `${req.ip}_${req.headers['user-agent'] || 'unknown'}`;
}

function memoryRateLimit(key, points, duration) {
  const now = Date.now();
  
  if (!memoryRateLimiter.has(key)) {
    memoryRateLimiter.set(key, { count: 1, resetTime: now + duration * 1000 });
    return { allowed: true, remaining: points - 1 };
  }
  
  const record = memoryRateLimiter.get(key);
  
  // Reset if duration has passed
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + duration * 1000;
    return { allowed: true, remaining: points - 1 };
  }
  
  // Check if limit exceeded
  if (record.count >= points) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: points - record.count };
}

export function createRateLimiter(type = 'general') {
  return async (req, res, next) => {
    const clientKey = getClientKey(req);
    const limiter = rateLimiters[type] || rateLimiters.general;
    
    try {
      // Try Redis-based rate limiting first
      if (limiter.storeClient) {
        try {
          const result = await limiter.consume(clientKey);
          
          // Add rate limit headers
          res.set({
            'X-RateLimit-Limit': limiter.points,
            'X-RateLimit-Remaining': result.remainingPoints,
            'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString()
          });
          
          next();
        } catch (rateLimitError) {
          // Rate limit exceeded
          res.set({
            'X-RateLimit-Limit': limiter.points,
            'X-RateLimit-Remaining': 0,
            'X-RateLimit-Reset': new Date(Date.now() + rateLimitError.msBeforeNext).toISOString(),
            'Retry-After': Math.round(rateLimitError.msBeforeNext / 1000)
          });
          
          logger.warn(`Rate limit exceeded for ${clientKey} on ${type} endpoint`);
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.round(rateLimitError.msBeforeNext / 1000)} seconds.`,
            retryAfter: Math.round(rateLimitError.msBeforeNext / 1000)
          });
        }
      } else {
        // Fallback to memory-based rate limiting
        const { points, duration } = limiter;
        const result = memoryRateLimit(clientKey, points, duration);
        
        if (!result.allowed) {
          const retryAfter = Math.round((result.resetTime - Date.now()) / 1000);
          
          res.set({
            'X-RateLimit-Limit': points,
            'X-RateLimit-Remaining': 0,
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': retryAfter
          });
          
          logger.warn(`Memory rate limit exceeded for ${clientKey} on ${type} endpoint`);
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            retryAfter
          });
        }
        
        res.set({
          'X-RateLimit-Limit': points,
          'X-RateLimit-Remaining': result.remaining
        });
        
        next();
      }
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request but log the issue
      next();
    }
  };
}

// Configure rate limiters with Redis client when available
export function configureRateLimiters(redisClient) {
  if (redisClient && redisClient.isReady) {
    Object.values(rateLimiters).forEach(limiter => {
      limiter.storeClient = redisClient;
    });
    logger.info('Rate limiters configured with Redis');
  } else {
    logger.warn('Rate limiters using memory fallback (Redis not available)');
  }
}

// Export specific rate limiters
export const rateLimiter = createRateLimiter('general');
export const analyticsRateLimiter = createRateLimiter('analytics');
export const aiRateLimiter = createRateLimiter('ai');

// Clean up memory rate limiter periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryRateLimiter.entries()) {
    if (now > record.resetTime) {
      memoryRateLimiter.delete(key);
    }
  }
}, 60000); // Clean every minute