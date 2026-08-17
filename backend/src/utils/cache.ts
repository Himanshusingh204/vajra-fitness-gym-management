import { redis, isRedisAvailable } from './redis';

// Cache-aside helper for read-heavy, poll-driven endpoints (dashboard stats,
// analytics) where the frontend already tolerates 20-60s staleness via its
// own refetchInterval. A DB round trip to a remote Postgres instance costs
// far more than that staleness window is worth — cache the JSON response
// for a few seconds so repeat polls hit Redis (sub-10ms) instead of the DB.
//
// Never use this for anything a user expects to see change immediately
// after their own action (mutations, "did my payment go through" reads) —
// TTL-only, no invalidation-on-write, by design, to keep this simple and
// avoid stale-cache-after-mutation bugs. Only apply to read endpoints where
// a few seconds of staleness is genuinely fine.
export async function getOrSetJSON<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
  if (!isRedisAvailable() || !redis) {
    return fetchFn();
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis read failed — fall through to a live fetch rather than error out.
  }

  const value = await fetchFn();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache write is best-effort — a failed write must never fail the request.
  }

  return value;
}
