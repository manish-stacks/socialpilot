'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  Clock,
  Layers,
  RefreshCw,
  RotateCcw,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle, Stat } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { Confirm } from '@/components/ui/confirm';
import { Button } from '@/components/ui/button';
import { Err, Paged, Pager, Table, Td, Unavail, useAdmin } from '@/components/admin/kit';

interface P {
  targetsByStatus: { status: string; count: number }[];
  queue: { available: boolean; counts?: Record<string, number>; reason?: string };
  health: {
    staleClaims: number;
    overdueTargets: number;
    scheduledNext24h: number;
    exhaustedTargets: number;
    note: string;
  };
  latencyMs24h: {
    attempts: number;
    p50: number | null;
    p95: number | null;
    max: number | null;
  };
  attemptOutcomes24h: Record<string, number>;
}

interface F {
  id: string;
  status: string;
  attempts: number;
  errorMessage: string | null;
  stage: string | null;
  post: { id: string; workspaceId: string; workspace: { name: string } };
  socialAccount: { platform: string; displayName: string; status: string };
  retryEligible: boolean;
  exhausted: boolean;
  needsConfirmation: boolean;
  reason: string;
  lastAttempt: { providerCode: string | null; outcome: string | null; httpStatus: number | null } | null;
}

const ms = (n: number | null) => (n === null ? '—' : n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);

export default function PublishingPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const p = useAdmin<P>('/publishing', true, 15000);
  const f = useAdmin<Paged<F> & { maxAttempts: number }>(
    `/publishing/failed?page=${page}&pageSize=15${status ? `&status=${status}` : ''}`,
    true,
    15000
  );

  const retry = useMutation({
    mutationFn: (v: { id: string; confirm: boolean }) =>
      api(`/admin/publishing/targets/${v.id}/retry`, {
        method: 'POST',
        body: JSON.stringify({ confirmDuplicateRisk: v.confirm }),
      }),
    onSuccess: () => {
      toast.success('Target queued for re-dispatch');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const d = p.data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Publishing Queue &amp; Dispatcher
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time BullMQ Redis queues, worker reconciliation health, and error recovery controls.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span>Auto-refreshes every 15s</span>
        </div>
      </div>

      <Err e={p.error} />

      {d && (
        <>
          {/* Worker Health Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Overdue Targets"
              value={d.health.overdueTargets}
              hint="Due >2m ago, unclaimed"
              icon={<Clock className="h-4 w-4 text-amber-600" />}
            />
            <Stat
              label="Stale Claims"
              value={d.health.staleClaims}
              hint="Worker lost heartbeat"
              icon={<AlertOctagon className="h-4 w-4 text-rose-600" />}
            />
            <Stat
              label="Scheduled (Next 24h)"
              value={d.health.scheduledNext24h}
              hint="Upcoming auto-dispatches"
              icon={<Zap className="h-4 w-4 text-blue-600" />}
            />
            <Stat
              label="Retries Exhausted"
              value={d.health.exhaustedTargets}
              hint="Reached max retry limit"
              icon={<RotateCcw className="h-4 w-4 text-purple-600" />}
            />
          </div>

          {d.health.overdueTargets > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <span>{d.health.note}</span>
            </div>
          )}

          {/* Queue & Performance Cards */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Targets by Current State</CardTitle>
                  <CardDescription>Aggregate post targets in database</CardDescription>
                </div>
                <Activity className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <ul className="space-y-2 pt-2 text-xs">
                {d.targetsByStatus.map((s) => (
                  <li key={s.status} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <Badge value={s.status} />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.count.toLocaleString()}</span>
                  </li>
                ))}
                {d.targetsByStatus.length === 0 && <li className="text-slate-400">No targets generated yet.</li>}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Redis BullMQ Worker State</CardTitle>
                  <CardDescription>Job queue partition metrics</CardDescription>
                </div>
                <Server className="h-4 w-4 text-slate-400" />
              </CardHeader>
              {d.queue.available ? (
                <ul className="space-y-2 pt-2 text-xs">
                  {Object.entries(d.queue.counts ?? {}).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 capitalize">
                      <span className="text-slate-600 dark:text-slate-400">{k}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{v}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-4">
                  <Unavail reason={d.queue.reason ?? 'Redis offline'} />
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Latency &amp; Outcomes (24h)</CardTitle>
                  <CardDescription>Provider roundtrip publishing speed</CardDescription>
                </div>
                <Zap className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Total Attempts</span>
                  <span className="font-bold">{d.latencyMs24h.attempts}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Latency Percentiles</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    p50: <b>{ms(d.latencyMs24h.p50)}</b> · p95: <b>{ms(d.latencyMs24h.p95)}</b>
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Max Delay</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{ms(d.latencyMs24h.max)}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-850 dark:text-slate-400">
                  {Object.entries(d.attemptOutcomes24h).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(' · ') || 'No attempts in last 24h'}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Failed & Uncertain Jobs Table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Target Failures &amp; Uncertain State Remediation
            </h2>
            <p className="text-xs text-slate-500">
              Jobs requiring manual retry inspection or verification to avoid double-publishing.
            </p>
          </div>
          <Select
            className="w-48 text-xs"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All (Failed + Uncertain)</option>
            <option value="FAILED">Failed Targets Only</option>
            <option value="UNCERTAIN">Uncertain Targets Only</option>
          </Select>
        </div>

        <Err e={f.error} />

        {f.data?.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
            No failed or uncertain publishing jobs in the system queue. All channels operational.
          </div>
        ) : (
          <>
            <Table head={['Workspace & Channel', 'State', 'Provider Error / Stage', 'HTTP Code', 'Attempts', 'Action']}>
              {f.data?.items.map((t) => (
                <tr key={t.id}>
                  <Td>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {t.post.workspace.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.socialAccount.platform} · {t.socialAccount.displayName}
                    </div>
                  </Td>
                  <Td>
                    <Badge value={t.status} />
                    {t.exhausted && (
                      <span className="block mt-1 text-[10px] font-semibold text-rose-600 uppercase">
                        Exhausted
                      </span>
                    )}
                  </Td>
                  <Td className="max-w-xs text-xs text-rose-700 dark:text-rose-400">
                    <div>{t.errorMessage ?? 'No error payload recorded'}</div>
                    {t.stage && <div className="text-[10px] text-slate-400">Stage: {t.stage}</div>}
                  </Td>
                  <Td className="text-xs font-mono">
                    {t.lastAttempt?.providerCode ?? '—'}
                    {t.lastAttempt?.httpStatus ? ` (HTTP ${t.lastAttempt.httpStatus})` : ''}
                  </Td>
                  <Td className="text-xs font-semibold">
                    {t.attempts} / {f.data!.maxAttempts}
                  </Td>
                  <Td>
                    {t.retryEligible ? (
                      t.needsConfirmation ? (
                        <Confirm
                          trigger="Retry anyway"
                          title="Retry an uncertain job?"
                          body="This post may already be live on the provider. Retrying can publish it twice. Only continue if you've verified it's missing."
                          action="Retry anyway"
                          onConfirm={() => retry.mutate({ id: t.id, confirm: true })}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate({ id: t.id, confirm: false })}
                          className="h-7 text-xs"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry</span>
                        </Button>
                      )
                    ) : (
                      <span className="text-xs text-slate-400" title={t.reason}>
                        {t.reason}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>

            {f.data && (
              <Pager
                page={f.data.page}
                pageSize={f.data.pageSize}
                total={f.data.total}
                set={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
