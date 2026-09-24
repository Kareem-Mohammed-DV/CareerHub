const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export type ApiEnvelope<T> = { data: T; meta?: { page: number; limit: number; total: number; totalPages: number } };

export async function apiEnvelope<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const request = (token: string | null) => fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  let response: Response;
  try { response = await request(localStorage.getItem('accessToken')); }
  catch { throw new Error('Unable to reach CareerHub. Check your connection and try again.'); }
  if (response.status === 401 && path !== '/auth/refresh') {
    try {
      const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      const refreshedBody = await refreshed.json() as { data?: { accessToken?: string } };
      if (refreshed.ok && refreshedBody.data?.accessToken) {
        localStorage.setItem('accessToken', refreshedBody.data.accessToken);
        response = await request(refreshedBody.data.accessToken);
      }
    } catch { /* Keep the original response so callers receive the authentication error. */ }
  }
  if (response.status === 204) return { data: undefined as T };
  const body: { data?: T; meta?: ApiEnvelope<T>['meta']; error?: { message?: string; details?: Record<string, string[]> } } = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== '/auth/refresh') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('careerhub.user');
    window.dispatchEvent(new Event('careerhub:unauthorized'));
  }
  if (!response.ok) throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  return { data: body.data as T, ...(body.meta ? { meta: body.meta } : {}) };
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await apiEnvelope<T>(path, options)).data;
}
