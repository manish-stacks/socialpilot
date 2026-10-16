export class MetaError extends Error {
  constructor(public httpStatus: number, message: string, public code?: number, public subcode?: number, public transient = false, public traceId?: string, public hadBody = true) { super(message); }
}
export class MetaNetworkError extends Error { constructor(public kind: 'timeout' | 'network', m: string) { super(m); } }

export const graphVersion = () => process.env.META_GRAPH_VERSION || 'v26.0';
export const graphUrl = (path: string) => `https://graph.facebook.com/${graphVersion()}/${path.replace(/^\//, '')}`;

type Params = Record<string, string | number | boolean | undefined>;
/** Tokens travel in the POST body (or GET query for the documented OAuth endpoints) and are never logged. */
export async function graph<T = any>(path: string, o: { method?: 'GET' | 'POST' | 'DELETE'; params?: Params; token?: string; timeoutMs?: number } = {}): Promise<T> {
  const method = o.method ?? 'GET';
  const p: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...o.params, ...(o.token ? { access_token: o.token } : {}) })) if (v !== undefined) p[k] = String(v);
  const qs = new URLSearchParams(p).toString();
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), o.timeoutMs ?? 30_000);
  let res: Response;
  try {
    res = method === 'GET' || method === 'DELETE'
      ? await fetch(`${graphUrl(path)}?${qs}`, { method, signal: ac.signal })
      : await fetch(graphUrl(path), { method, signal: ac.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: qs });
  } catch (e: any) {
    throw new MetaNetworkError(e?.name === 'AbortError' ? 'timeout' : 'network', e?.name === 'AbortError' ? 'Request to Meta timed out' : 'Could not reach Meta');
  } finally { clearTimeout(timer); }
  const text = await res.text();
  let json: any; try { json = JSON.parse(text); } catch { json = undefined; }
  if (!res.ok || json?.error) {
    const er = json?.error;
    throw new MetaError(res.status, sanitize(er?.message ?? `Meta returned HTTP ${res.status}`), er?.code, er?.error_subcode, !!er?.is_transient, er?.fbtrace_id, !!er);
  }
  return json as T;
}

/** Strip anything token-shaped and cap length before persisting provider messages. */
export function sanitize(m: string): string {
  return m.replace(/access_token=[^&\s"]+/gi, 'access_token=[redacted]').replace(/EA[A-Za-z0-9]{20,}/g, '[redacted]').replace(/client_secret=[^&\s"]+/gi, 'client_secret=[redacted]').slice(0, 300);
}

export type Classified = { kind: 'RETRYABLE' | 'RATE_LIMIT' | 'AUTH' | 'PERMANENT' | 'UNCERTAIN'; message: string; code?: string; http?: number };
const AUTH_CODES = new Set([190, 102, 467]);
const AUTH_SUB = new Set([458, 459, 460, 463, 464, 467]);
const RATE_CODES = new Set([4, 17, 32, 613, 80001, 80002, 80003, 80004, 80005, 80006, 80008, 80009, 80014]);
const TEMP_CODES = new Set([1, 2, 9007]); // 9007: IG media container not ready yet

/** `mutating` = the failed request was a state-changing call whose effect on Meta's side may be unknown. */
export function classifyMeta(e: unknown, mutating: boolean): Classified | null {
  if (e instanceof MetaNetworkError) return mutating
    ? { kind: 'UNCERTAIN', message: `${e.message}; the post may or may not have been created` }
    : { kind: 'RETRYABLE', message: e.message };
  if (!(e instanceof MetaError)) return null;
  const base = { message: e.message, code: e.code !== undefined ? String(e.code) : undefined, http: e.httpStatus };
  if (!e.hadBody && e.httpStatus >= 500) return mutating ? { ...base, kind: 'UNCERTAIN' } : { ...base, kind: 'RETRYABLE' };
  if (AUTH_CODES.has(e.code ?? -1) || AUTH_SUB.has(e.subcode ?? -1)) return { ...base, kind: 'AUTH' };
  if (RATE_CODES.has(e.code ?? -1)) return { ...base, kind: 'RATE_LIMIT' };
  if (e.transient || TEMP_CODES.has(e.code ?? -1) || e.httpStatus >= 500) return { ...base, kind: 'RETRYABLE' };
  return { ...base, kind: 'PERMANENT' };
}
