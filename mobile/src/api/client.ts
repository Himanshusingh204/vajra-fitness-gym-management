import { ApiError, errorFromResponse, networkError } from './errors';

export type TokenStore = {
  getAccess: () => string | null;
  setAccess: (token: string | null) => void;
  getRefresh: () => Promise<string | null>;
  setRefresh: (token: string | null) => Promise<void>;
};

type ClientOptions = {
  baseUrl: string;
  tokens: TokenStore;
  // Called when the refresh token is rejected, so the app can return to sign in.
  onSessionEnded?: () => void;
  fetchImpl?: typeof fetch;
};

type RequestOptions = {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
};

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient({ baseUrl, tokens, onSessionEnded, fetchImpl }: ClientOptions) {
  const doFetch = fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const root = baseUrl.replace(/\/+$/, '');

  const buildUrl = (path: string, query?: RequestOptions['query']) => {
    let url = root + path;
    if (query) {
      const params = Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      if (params.length) url += `?${params.join('&')}`;
    }
    return url;
  };

  const send = async (method: string, path: string, opts: RequestOptions, accessToken: string | null) => {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Client': 'mobile' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    try {
      return await doFetch(buildUrl(path, opts.query), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch {
      throw networkError();
    }
  };

  const readJson = async (res: Response): Promise<unknown> => {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const performRefresh = async (): Promise<string | null> => {
    const refreshToken = await tokens.getRefresh();
    if (!refreshToken) return null;

    const res = await send('POST', '/auth/refresh', { body: { refreshToken } }, null);
    const data = (await readJson(res)) as { token?: string; refreshToken?: string } | null;
    if (!res.ok || !data?.token) {
      // Only a definite rejection ends the session; a 5xx might be a blip.
      if (res.status === 401 || res.status === 403) {
        tokens.setAccess(null);
        await tokens.setRefresh(null);
        return null;
      }
      throw errorFromResponse(res.status, data);
    }
    tokens.setAccess(data.token);
    if (data.refreshToken) await tokens.setRefresh(data.refreshToken);
    return data.token;
  };

  // Single flight: the refresh token rotates on every use and the server
  // revokes the whole session if an old one is presented again, so parallel
  // 401s must share one refresh call instead of each sending their own.
  let inFlight: Promise<string | null> | null = null;
  const refreshAccessToken = (): Promise<string | null> => {
    if (!inFlight) {
      inFlight = performRefresh().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };

  const request = async <T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> => {
    const useAuth = opts.auth !== false;
    let res = await send(method, path, opts, useAuth ? tokens.getAccess() : null);

    if (res.status === 401 && useAuth && !path.startsWith('/auth/refresh')) {
      const token = await refreshAccessToken();
      if (token) {
        res = await send(method, path, opts, token);
      } else {
        onSessionEnded?.();
      }
    }

    const data = await readJson(res);
    if (!res.ok) throw errorFromResponse(res.status, data);
    return data as T;
  };

  return {
    request,
    refreshAccessToken,
    get: <T>(path: string, query?: RequestOptions['query']) => request<T>('GET', path, { query }),
    post: <T>(path: string, body?: unknown, auth = true) => request<T>('POST', path, { body, auth }),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  };
}

export { ApiError };
