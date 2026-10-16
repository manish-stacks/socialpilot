export type TargetStatusCode = 'PENDING' | 'QUEUED' | 'PUBLISHING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'UNCERTAIN' | 'CANCELLED';
export type PostStatusOut = 'PUBLISHING' | 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'CANCELLED';
const OPEN = new Set(['PENDING', 'QUEUED', 'PUBLISHING', 'PROCESSING']);
/** Post status is always derived from its targets, never set from client input. */
export function aggregatePostStatus(ts: string[]): PostStatusOut {
  if (ts.some((s) => OPEN.has(s))) return 'PUBLISHING';
  const pub = ts.filter((s) => s === 'PUBLISHED').length, bad = ts.filter((s) => s === 'FAILED' || s === 'UNCERTAIN').length;
  if (pub && bad) return 'PARTIALLY_PUBLISHED';
  if (pub) return 'PUBLISHED';
  return bad ? 'FAILED' : 'CANCELLED';
}
export const maxAttempts = () => Number(process.env.PUBLISH_MAX_ATTEMPTS ?? 5);
export const MAX_POLLS = 60;
export const STALE_CLAIM_MS = 10 * 60_000;
/** 30s, 1m, 2m, 4m ... capped at 30m, with up to 20% jitter. */
export function backoffMs(attempt: number, rand = Math.random()): number {
  const base = Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 30 * 60_000);
  return Math.round(base * (1 + rand * 0.2));
}
