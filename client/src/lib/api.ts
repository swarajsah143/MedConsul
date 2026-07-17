const API_BASE = '/api';

// When true, prevents tryRefresh from re-setting tokens after logout
let loggedOut = false;

export function markLoggedOut() { loggedOut = true; }
export function clearLoggedOut() { loggedOut = false; }

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

  let data: any;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw { status: res.status, message: `Server error (${res.status})` };
    throw { status: res.status, message: 'Invalid server response' };
  }

  if (!res.ok) {
    // Try token refresh on 401 (but never after logout)
    if (res.status === 401 && token && !url.includes('/auth/refresh') && !loggedOut) {
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
        const retryData = await retryRes.json().catch(() => ({}));
        // Carry `errors` through: the admin form needs field-level validation errors,
        // not just a message.
        if (!retryRes.ok) {
          throw { status: retryRes.status, message: retryData.message || 'Request failed', errors: retryData.errors };
        }
        return retryData;
      }
    }
    throw { status: res.status, message: data.message || 'Request failed', errors: data.errors, references: data.references };
  }

  return data;
}

async function tryRefresh(): Promise<boolean> {
  if (loggedOut) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await res.json().catch(() => null);
    if (!loggedOut && res.ok && data?.success && data.data?.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      return true;
    }
  } catch { /* ignore */ }
  if (!loggedOut) localStorage.removeItem('accessToken');
  return false;
}

export const api = {
  get: <T = any>(url: string) => request<T>(url),
  post: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  put: <T = any>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
  delete: <T = any>(url: string) => request<T>(url, { method: 'DELETE' }),
};
