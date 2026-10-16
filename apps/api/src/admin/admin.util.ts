export const paging = (q: { page?: number; pageSize?: number }) => { const pageSize = q.pageSize ?? 25, page = q.page ?? 1; return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }; };
export const sinceDays = (d = 30) => new Date(Date.now() - d * 86_400_000);
export function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}
export function bucketByDay(dates: Date[]): { date: string; count: number }[] {
  const m: Record<string, number> = {};
  for (const d of dates) { const k = d.toISOString().slice(0, 10); m[k] = (m[k] ?? 0) + 1; }
  return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}
/** A failed target can be retried by an admin only if its account is healthy; UNCERTAIN always needs explicit confirmation. */
export function retryInfo(t: { status: string; attempts: number; socialAccount: { status: string } }, max: number) {
  const exhausted = t.status === 'FAILED' && t.attempts >= max;
  if (t.socialAccount.status !== 'ACTIVE') return { retryEligible: false, exhausted, needsConfirmation: false, reason: 'Account needs to be reconnected by the workspace first' };
  if (t.status === 'UNCERTAIN') return { retryEligible: true, exhausted, needsConfirmation: true, reason: 'Outcome unknown; may already be live. Retrying can duplicate the post.' };
  return { retryEligible: t.status === 'FAILED', exhausted, needsConfirmation: false, reason: exhausted ? 'Retries exhausted' : 'Failed' };
}
