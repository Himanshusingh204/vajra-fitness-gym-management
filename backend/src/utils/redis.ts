import Redis from 'ioredis';

// Optional Redis connection for shared rate limiting / lockout state across
// multiple instances. When REDIS_URL is absent or unreachable every consumer
// falls back to in-memory storage, so the app keeps working on a single box.
const REDIS_URL = process.env.REDIS_URL || null;

export const redis: Redis | null = REDIS_URL
  ? new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    })
  : null;

let redisHealthy = redis !== null;

if (redis) {
  redis.on('error', () => {
    redisHealthy = false;
  });
  redis.on('ready', () => {
    redisHealthy = true;
  });
  redis.connect().catch(() => {
    redisHealthy = false;
  });
}

export const isRedisAvailable = () => redis !== null && redisHealthy;
