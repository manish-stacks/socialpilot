const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
let accessToken: string | null = null; // memory only — never persisted to storage
export const setToken = (t: string | null) => { accessToken = t; };
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function raw(path: string, init: RequestInit = {}) {
  try { return await fetch(`${BASE}${path}`, {
    ...init, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers },
  }); } catch { throw new ApiError(0, `Can't reach the server at ${BASE}. Make sure the API is running (npm run dev:api) and check its terminal for errors.`); }
}
let inflight: Promise<boolean> | null = null;
/** Single-flight: concurrent callers share one refresh (rotating refresh tokens must be used once). */
export function refreshSession(): Promise<boolean> { return (inflight ??= doRefresh().finally(() => { inflight = null; })); }
async function doRefresh(): Promise<boolean> {
  const r = await raw('/auth/refresh', { method: 'POST' }).catch(() => null);
  if (!r) { accessToken = null; return false; }
  if (!r.ok) { accessToken = null; return false; }
  accessToken = (await r.json()).accessToken; return true;
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r = await raw(path, init);
  if (r.status === 401 && !path.startsWith('/auth/') && (await refreshSession())) r = await raw(path, init);
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    throw new ApiError(r.status, Array.isArray(b.message) ? b.message.join(', ') : b.message ?? 'Request failed');
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
export interface User { id: string; email: string; name: string; systemRole: string }
export interface Workspace { id: string; name: string; slug: string; timezone: string; role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER' }
