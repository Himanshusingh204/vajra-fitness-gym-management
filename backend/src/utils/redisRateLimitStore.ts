import type { Store, Options } from 'express-rate-limit';
import { redis, isRedisAvailable } from './redis';

// A hybrid rate-limit store: Redis-backed when available, in-memory fallback
// otherwise. Keys are namespaced per limiter prefix to avoid collisions
// between the different limiters sharing one Redis instance.
export class RedisRateLimitStore implements Store {
  localKeys = false;

  readonly prefix: string;
  private windowMs = 60 * 1000;
  private readonly memory = new Map<string, { count: number; resetAt: number }>();

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options) {
    this.windowMs = typeof options.windowMs === 'number' ? options.windowMs : this.windowMs;
  }

  private key(key: string) {
    return `rl:${this.prefix}:${key}`;
  }

  async increment(key: string) {
    const now = Date.now();

    // Redis path — shared across instances.
    if (isRedisAvailable() && redis) {
      try {
        const rkey = this.key(key);
        const count = await redis.incr(rkey);
        if (count === 1) {
          await redis.pexpire(rkey, this.windowMs);
        }
        return { totalHits: count, resetTime: new Date(now + this.windowMs) };
      } catch {
        /* fall through to memory below */
      }
    }

    // In-memory fallback.
    const entry = this.memory.get(key);
    if (!entry || entry.resetAt <= now) {
      this.memory.set(key, { count: 1, resetAt: now + this.windowMs });
      return { totalHits: 1, resetTime: new Date(now + this.windowMs) };
    }
    entry.count += 1;
    return { totalHits: entry.count, resetTime: new Date(entry.resetAt) };
  }

  async decrement(key: string) {
    if (isRedisAvailable() && redis) {
      try {
        await redis.decr(this.key(key)).then((c) => (c < 0 ? redis!.del(this.key(key)) : undefined));
        return;
      } catch {
        /* fall through */
      }
    }
    const entry = this.memory.get(key);
    if (entry && entry.count > 0) entry.count -= 1;
  }

  async resetKey(key: string) {
    if (isRedisAvailable() && redis) {
      try {
        await redis.del(this.key(key));
      } catch {
        /* ignore */
      }
    }
    this.memory.delete(key);
  }
}
