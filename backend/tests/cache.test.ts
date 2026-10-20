import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { setRedisClientForTesting } from '../src/utils/redis';
import { getOrSetJSON } from '../src/utils/cache';

// utils/redis wraps a real ioredis connection keyed off REDIS_URL. There's
// no ioredis-mock release compatible with the ioredis v6 this app uses
// (ioredis-mock's latest, 8.13.1, still peer-depends on ioredis ^5), so this
// is a small hand-rolled stand-in implementing exactly the three commands
// cache.ts actually calls (get/set/ttl) — enough to exercise the real
// cache.ts logic (get → parse → fetch-on-miss → set-with-TTL) without a
// live Redis server, which isn't available in every environment this runs in.
class FakeRedis {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, _mode: 'EX', ttlSeconds: number): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return 'OK';
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  clear() {
    this.store.clear();
  }
}

const fakeRedis = new FakeRedis();

describe('getOrSetJSON', () => {
  beforeEach(() => {
    fakeRedis.clear();
    setRedisClientForTesting(fakeRedis, true);
  });

  afterAll(() => {
    setRedisClientForTesting(null, false);
  });

  it('calls fetchFn and caches the result on a miss', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ value: 42 });

    const result = await getOrSetJSON('test:key', 30, fetchFn);

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const cached = await fakeRedis.get('test:key');
    expect(JSON.parse(cached!)).toEqual({ value: 42 });
  });

  it('returns the cached value on a hit without calling fetchFn again', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ value: 1 });

    await getOrSetJSON('test:key', 30, fetchFn);
    const second = await getOrSetJSON('test:key', 30, fetchFn);

    expect(second).toEqual({ value: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('sets the TTL on write', async () => {
    const setSpy = vi.spyOn(fakeRedis, 'set');

    await getOrSetJSON('test:ttl-key', 30, async () => ({ ok: true }));

    expect(setSpy).toHaveBeenCalledWith('test:ttl-key', JSON.stringify({ ok: true }), 'EX', 30);
    setSpy.mockRestore();
  });

  it('re-fetches once the cached entry expires', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ value: 'first' })
      .mockResolvedValueOnce({ value: 'second' });

    await getOrSetJSON('test:expiring', 1, fetchFn);
    await fakeRedis.del('test:expiring'); // simulate TTL expiry without a real 1s wait

    const result = await getOrSetJSON('test:expiring', 1, fetchFn);

    expect(result).toEqual({ value: 'second' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('falls through to a live fetch when the cache read itself errors', async () => {
    const getSpy = vi.spyOn(fakeRedis, 'get').mockRejectedValueOnce(new Error('connection reset'));
    const fetchFn = vi.fn().mockResolvedValue({ value: 'live' });

    const result = await getOrSetJSON('test:key', 30, fetchFn);

    expect(result).toEqual({ value: 'live' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    getSpy.mockRestore();
  });

  it('does not fail the request when the cache write itself errors', async () => {
    const setSpy = vi.spyOn(fakeRedis, 'set').mockRejectedValueOnce(new Error('connection reset'));
    const fetchFn = vi.fn().mockResolvedValue({ value: 'still works' });

    const result = await getOrSetJSON('test:key', 30, fetchFn);

    expect(result).toEqual({ value: 'still works' });
    setSpy.mockRestore();
  });
});
