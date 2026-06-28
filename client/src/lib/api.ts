const API_BASE = '/api';

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T = any>(url: string, opts: ApiOptions = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    // Try token refresh on 401
    if (res.status === 401 && token && !url.includes('/auth/refresh')) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
        const retryRes = await fetch(`${API_BASE}${url}`, {
          method: opts.method || 'GET',
          headers,
          body: opts.body ? JSON.stringify(opts.body) : undefined,
          credentials: 'include',
        });
        const retryData = await retryRes.json();
        if (!retryRes.ok) throw { status: retryRes.status, message: retryData.message };
        return retryData;
      }
    }
    throw { status: res.status, message: data.message || 'Request failed' };
  }

  return data;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok && data.success && data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      return true;
    }
  } catch { /* ignore */ }
  localStorage.removeItem('accessToken');
  return false;
}

export const api = {
  get: <T = any>(url: string) => request<T>(url),
  post: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  put: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
  delete: <T = any>(url: string) => request<T>(url, { method: 'DELETE' }),
};
