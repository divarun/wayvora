import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client with retry strategy
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

redis.on('reconnecting', () => {
  console.log('⚠️  Redis reconnecting...');
});

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  OVERPASS: 3600,        // 1 hour - POI data changes infrequently
  NOMINATIM: 86400,      // 24 hours - geocoding results are stable
  AI_NEIGHBORHOOD: 604800, // 7 days - neighborhood facts don't change
  AI_TIPS: 3600,         // 1 hour - travel tips can be reused
  AI_RECOMMENDATIONS: 1800, // 30 minutes - recommendations based on context
  PASSPORT: 300,         // 5 minutes - user passport data (frequent updates)
  STAMPS: 300,           // 5 minutes - stamps collection
};

/**
 * Generate cache key with prefix
 */
function getCacheKey(prefix: string, ...parts: string[]): string {
  return `wayvora:${prefix}:${parts.join(':')}`;
}

/**
 * Get cached data
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Cache get error for key ${key}:`, err);
    return null;
  }
}

/**
 * Set cached data with TTL
 */
export async function setCache(
  key: string,
  data: any,
  ttl: number = CACHE_TTL.OVERPASS
): Promise<boolean> {
  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Cache set error for key ${key}:`, err);
    return false;
  }
}

/**
 * Delete cached data
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.error(`Cache delete error for key ${key}:`, err);
    return false;
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  } catch (err) {
    console.error(`Cache pattern delete error for ${pattern}:`, err);
    return 0;
  }
}

/**
 * Cache helpers for specific services
 */
export const CacheKeys = {
  overpass: (query: string) => getCacheKey('overpass', Buffer.from(query).toString('base64').substring(0, 50)),
  nominatim: (type: 'search' | 'reverse', params: string) => getCacheKey('nominatim', type, params),
  aiNeighborhoodFact: (neighborhood: string, city: string) =>
    getCacheKey('ai', 'neighborhood', city.toLowerCase(), neighborhood.toLowerCase()),
  aiTips: (poiName: string, category: string) =>
    getCacheKey('ai', 'tips', category, poiName.toLowerCase().substring(0, 30)),
  aiRecommendations: (selectedPois: string, preferences: string) =>
    getCacheKey('ai', 'recs', Buffer.from(selectedPois + preferences).toString('base64').substring(0, 50)),
  userPassport: (userId: string) => getCacheKey('passport', userId),
  userStamps: (userId: string) => getCacheKey('stamps', userId),
  userBadges: (userId: string) => getCacheKey('badges', userId),
};

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    deleteCache(CacheKeys.userPassport(userId)),
    deleteCache(CacheKeys.userStamps(userId)),
    deleteCache(CacheKeys.userBadges(userId)),
  ]);
}

/**
 * Health check
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export default redis;
