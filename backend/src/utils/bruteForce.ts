import { redis, isRedisAvailable } from './redis';

// Distributed brute-force lockout. Counters live in Redis when available so
// multiple instances share state; otherwise an in-memory Map is used. The
// callers keep working regardless of Redis availability.

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const KEY_PREFIX = 'auth:lockout:';

const memory = new Map<string, { count: number; lockedUntil: number }>();

const memKey = (key: string) => `${KEY_PREFIX}mem:${key}`;

// Returns milliseconds remaining in the lock (0 = not locked).
export const isLocked = async (key: string): Promise<number> => {
  if (isRedisAvailable() && redis) {
    try {
      const lockedUntil = await redis.get(KEY_PREFIX + key);
      if (lockedUntil) {
        const remaining = Number(lockedUntil) - Date.now();
        return remaining > 0 ? remaining : 0;
      }
      return 0;
    } catch {
      /* fall through to memory */
    }
  }

  const entry = memory.get(key);
  if (!entry) return 0;
  if (entry.lockedUntil > 0) {
    if (Date.now() >= entry.lockedUntil) {
      memory.delete(key);
      return 0;
    }
    return entry.lockedUntil - Date.now();
  }
  return 0;
};

export const registerFailure = async (key: string): Promise<void> => {
  if (isRedisAvailable() && redis) {
    try {
      const rkey = KEY_PREFIX + key;
      const count = await redis.incr(rkey);
      if (count === 1) {
        await redis.pexpire(rkey, LOCK_WINDOW_MS);
      }
      if (count >= MAX_FAILED_ATTEMPTS) {
        await redis.set(rkey, String(Date.now() + LOCK_WINDOW_MS), 'PX', LOCK_WINDOW_MS);
      }
      return;
    } catch {
      /* fall through */
    }
  }

  const entry = memory.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_WINDOW_MS;
  }
  memory.set(key, entry);
};

export const clearFailures = async (key: string): Promise<void> => {
  if (isRedisAvailable() && redis) {
    try {
      await redis.del(KEY_PREFIX + key);
    } catch {
      /* ignore */
    }
  }
  memory.delete(key);
};
