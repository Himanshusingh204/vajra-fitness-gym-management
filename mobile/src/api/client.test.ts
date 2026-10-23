import { describe, expect, it, vi } from 'vitest';
import { createApiClient, type TokenStore } from './client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function memoryTokens(access: string | null, refresh: string | null): TokenStore & { refresh: string | null } {
  const store = {
    access,
    refresh,
    getAccess: () => store.access,
    setAccess: (t: string | null) => {
      store.access = t;
    },
    getRefresh: async () => store.refresh,
    setRefresh: async (t: string | null) => {
      store.refresh = t;
    },
  };
  return store;
}

describe('api client', () => {
  it('sends the mobile client header and bearer token', async () => {
    const fetchImpl = vi.fn(async () => json(200, { ok: true }));
    const api = createApiClient({ baseUrl: 'https://x.test/api/', tokens: memoryTokens('a1', 'r1'), fetchImpl });

    await api.get('/auth/me');

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.test/api/auth/me');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Client']).toBe('mobile');
    expect(headers.Authorization).toBe('Bearer a1');
  });

  it('refreshes once for parallel 401s and retries each request', async () => {
    const tokens = memoryTokens('old', 'r1');
    let refreshCalls = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      if (String(url).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        expect(JSON.parse(String(init?.body))).toEqual({ refreshToken: 'r1' });
        await new Promise((r) => setTimeout(r, 5));
        return json(200, { token: 'new', refreshToken: 'r2' });
      }
      return auth === 'Bearer new' ? json(200, { url: String(url) }) : json(401, { error: 'expired' });
    });
    const api = createApiClient({ baseUrl: 'https://x.test/api', tokens, fetchImpl });

    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(refreshCalls).toBe(1);
    expect(results).toHaveLength(3);
    expect(tokens.getAccess()).toBe('new');
    expect(tokens.refresh).toBe('r2');
  });

  it('ends the session when the refresh token is rejected', async () => {
    const tokens = memoryTokens('old', 'r1');
    const onSessionEnded = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) =>
      String(url).endsWith('/auth/refresh') ? json(401, { error: 'reuse' }) : json(401, { error: 'expired' }),
    );
    const api = createApiClient({ baseUrl: 'https://x.test/api', tokens, fetchImpl, onSessionEnded });

    await expect(api.get('/a')).rejects.toMatchObject({ status: 401 });
    expect(onSessionEnded).toHaveBeenCalledOnce();
    expect(tokens.getAccess()).toBeNull();
    expect(tokens.refresh).toBeNull();
  });

  it('keeps the session when the refresh call fails on the network', async () => {
    const tokens = memoryTokens('old', 'r1');
    const onSessionEnded = vi.fn();
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/auth/refresh')) throw new TypeError('Network request failed');
      return json(401, { error: 'expired' });
    });
    const api = createApiClient({ baseUrl: 'https://x.test/api', tokens, fetchImpl, onSessionEnded });

    await expect(api.get('/a')).rejects.toMatchObject({ code: 'NETWORK' });
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(tokens.refresh).toBe('r1');
  });

  it('does not try to refresh for unauthenticated calls', async () => {
    const fetchImpl = vi.fn(async () => json(401, { error: 'Invalid credentials' }));
    const api = createApiClient({ baseUrl: 'https://x.test/api', tokens: memoryTokens(null, 'r1'), fetchImpl });

    await expect(api.post('/auth/login', { email: 'a@b.c', password: 'x' }, false)).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
