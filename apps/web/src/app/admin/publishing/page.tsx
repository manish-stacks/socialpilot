'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, Stat } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { Confirm } from '@/components/ui/confirm';
import { Button } from '@/components/ui/button';
import { Err, Paged, Pager, Table, Td, Unavail, useAdmin } from '@/components/admin/kit';

interface P { targetsByStatus: { status: string; count: number }[]; queue: { available: boolean; counts?: Record<string, number>; reason?: string };
  health: { staleClaims: number; overdueTargets: number; scheduledNext24h: number; exhaustedTargets: number; note: string }; latencyMs24h: { attempts: number; p50: number | null; p95: number | null; max: number | null }; attemptOutcomes24h: Record<string, number> }
interface F { id: string; status: string; attempts: number; errorMessage: string | null; stage: string | null; post: { id: string; workspaceId: string; workspace: { name: string } }; socialAccount: { platform: string; displayName: string; status: string };
  retryEligible: boolean; exhausted: boolean; needsConfirmation: boolean; reason: string; lastAttempt: { providerCode: string | null; outcome: string | null; httpStatus: number | null } | null }
const ms = (n: number | null) => (n === null ? '—' : n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);

export default function Publishing() {
  const qc = useQueryClient(), [page, setPage] = useState(1), [status, setStatus] = useState('');
  const p = useAdmin<P>('/publishing', true, 15000), f = useAdmin<Paged<F> & { maxAttempts: number }>(`/publishing/failed?page=${page}&pageSize=15${status ? `&status=${status}` : ''}`, true, 15000);
  const retry = useMutation({ mutationFn: (v: { id: string; confirm: boolean }) => api(`/admin/publishing/targets/${v.id}/retry`, { method: 'POST', body: JSON.stringify({ confirmDuplicateRisk: v.confirm }) }),
    onSuccess: () => { toast.success('Retry queued'); qc.invalidateQueries({ queryKey: ['admin'] }); }, onError: (e) => toast.error((e as Error).message) });
  const d = p.data;
  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Publishing queue</h1><Err e={p.error} />
      {d && (<>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Stat label="Overdue targets" value={d.health.overdueTargets} hint="due >2 min ago, not claimed" /><Stat label="Stale claims" value={d.health.staleClaims} hint="worker likely crashed" /><Stat label="Scheduled next 24h" value={d.health.scheduledNext24h} /><Stat label="Retries exhausted" value={d.health.exhaustedTargets} /></div>
        {d.health.overdueTargets > 0 && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{d.health.note}</p>}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardTitle>Targets by status</CardTitle><ul className="mt-2 space-y-1 text-sm">{d.targetsByStatus.map((s) => <li key={s.status} className="flex justify-between"><Badge value={s.status} /><b>{s.count}</b></li>)}{d.targetsByStatus.length === 0 && <li className="text-neutral-500">No targets yet.</li>}</ul></Card>
          <Card><CardTitle>Redis queue</CardTitle>{d.queue.available ? <ul className="mt-2 space-y-1 text-sm">{Object.entries(d.queue.counts ?? {}).map(([k, v]) => <li key={k} className="flex justify-between"><span>{k}</span><b>{v}</b></li>)}</ul> : <p className="mt-2"><Unavail reason={d.queue.reason ?? 'unavailable'} /></p>}</Card>
          <Card><CardTitle>Latency, last 24h</CardTitle><ul className="mt-2 space-y-1 text-sm"><li>Attempts: <b>{d.latencyMs24h.attempts}</b></li><li>p50: <b>{ms(d.latencyMs24h.p50)}</b> · p95: <b>{ms(d.latencyMs24h.p95)}</b> · max: <b>{ms(d.latencyMs24h.max)}</b></li>
            <li className="text-xs text-neutral-500">{Object.entries(d.attemptOutcomes24h).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(' · ') || 'no attempts'}</li></ul></Card></div></>)}
      <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Failed &amp; uncertain jobs</h2>
        <Select className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Failed + uncertain</option><option>FAILED</option><option>UNCERTAIN</option></Select></div><Err e={f.error} />
        {f.data?.items.length === 0 ? <p className="text-sm text-neutral-500">No failed jobs.</p> : <>
          <Table head={['Workspace / account', 'Status', 'Error', 'Provider code', 'Attempts', '']}>{f.data?.items.map((t) => (
            <tr key={t.id}><Td><div className="font-medium">{t.post.workspace.name}</div><div className="text-xs text-neutral-500">{t.socialAccount.platform} · {t.socialAccount.displayName}{t.socialAccount.status !== 'ACTIVE' && ` · ${t.socialAccount.status.toLowerCase()}`}</div></Td>
              <Td><Badge value={t.status} />{t.exhausted && <div className="mt-1 text-[11px] text-neutral-500">exhausted</div>}</Td><Td className="max-w-xs text-xs text-red-700">{t.errorMessage ?? '—'}</Td>
              <Td className="text-xs">{t.lastAttempt?.providerCode ?? '—'}{t.lastAttempt?.httpStatus ? ` / HTTP ${t.lastAttempt.httpStatus}` : ''}</Td><Td>{t.attempts} / {f.data!.maxAttempts}</Td>
              <Td>{t.retryEligible ? (t.needsConfirmation
                ? <Confirm trigger="Retry anyway" title="Retry an uncertain job?" body="This post may already be live on the provider. Retrying can publish it twice. Only continue if you've verified it's missing." action="Retry anyway" onConfirm={() => retry.mutate({ id: t.id, confirm: true })} />
                : <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate({ id: t.id, confirm: false })}>Retry</Button>) : <span className="text-xs text-neutral-500" title={t.reason}>{t.reason}</span>}</Td></tr>))}</Table>
          {f.data && <Pager page={f.data.page} pageSize={f.data.pageSize} total={f.data.total} set={setPage} />}</>}
        <p className="text-xs text-neutral-500">Retries use the same guarded path as customers: healthy account required, atomic state change, uncertain jobs need explicit confirmation, every retry is audit-logged. Post content is not shown here.</p></div>
    </div>
  );
}
