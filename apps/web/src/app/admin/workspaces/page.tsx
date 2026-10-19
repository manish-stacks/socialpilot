'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  Calendar,
  Globe,
  Link2,
  Lock,
  Search,
  Sparkles,
  Unlock,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { Err, Paged, Pager, ReasonDialog, Table, Td, Unavail, dt, useAdmin } from '@/components/admin/kit';
import { cn } from '@/lib/utils';

interface W {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  suspendedAt: string | null;
  plan: string;
  subscriptionStatus: string;
  _count: { members: number; socialAccounts: number; posts: number };
}

interface D {
  id: string;
  name: string;
  timezone: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  plan: { name: string } | null;
  usage: {
    aiUsed: number;
    aiLimit: number | null;
    accountsUsed: number;
    accountsLimit: number | null;
  };
  members: { role: string; user: { id: string; email: string; name: string; status: string } }[];
  socialAccounts: {
    id: string;
    platform: string;
    displayName: string;
    status: string;
    tokenExpiresAt: string | null;
  }[];
  postsByStatus: { status: string; count: number }[];
  recentActivity: { id: string; action: string; createdAt: string }[];
  abuseReports: { available: boolean; reason: string };
}

export default function WorkspacesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useAdmin<Paged<W>>(
    `/workspaces?page=${page}&pageSize=20${q ? `&q=${encodeURIComponent(q)}` : ''}`
  );
  const d = useAdmin<D>(`/workspaces/${sel}`, !!sel);

  const act = useMutation({
    mutationFn: (v: { id: string; op: 'suspend' | 'reactivate'; reason: string }) =>
      api(`/admin/workspaces/${v.id}/${v.op}`, {
        method: 'POST',
        body: JSON.stringify({ reason: v.reason }),
      }),
    onSuccess: () => {
      toast.success('Workspace status updated');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Workspaces
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage customer tenant environments, monitor tier quotas, and inspect member allocations.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-10"
          placeholder="Search by workspace name or slug…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Err e={list.error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Workspaces List Table */}
        <div className="space-y-4">
          <Table head={['Workspace', 'Plan & Billing', 'Capacity (Users / Accounts / Posts)', 'State']}>
            {list.data?.items.map((w) => {
              const isSelected = sel === w.id;
              return (
                <tr
                  key={w.id}
                  onClick={() => setSel(w.id)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-800/60',
                    isSelected && 'bg-blue-50/80 dark:bg-slate-800/90'
                  )}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold dark:bg-blue-950/50 dark:text-blue-400">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {w.name}
                        </div>
                        <div className="text-xs text-slate-500">Created {dt(w.createdAt)}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {w.plan}
                    </span>
                    <div className="mt-0.5 text-[11px] text-slate-500">{w.subscriptionStatus}</div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                      <span title="Team members">{w._count.members} users</span>
                      <span>·</span>
                      <span title="Social accounts">{w._count.socialAccounts} channels</span>
                      <span>·</span>
                      <span title="Posts created">{w._count.posts} posts</span>
                    </div>
                  </Td>
                  <Td>
                    <Badge value={w.suspendedAt ? 'REVOKED' : 'ACTIVE'} />
                  </Td>
                </tr>
              );
            })}
          </Table>

          {list.data && (
            <Pager
              page={list.data.page}
              pageSize={list.data.pageSize}
              total={list.data.total}
              set={setPage}
            />
          )}
        </div>

        {/* Selected Workspace Details Sidebar */}
        <div>
          <Card className="sticky top-24">
            {!sel ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Building2 className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                Select any workspace to inspect membership, quota consumption, and settings.
              </div>
            ) : d.data ? (
              <div className="space-y-5 text-sm">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <CardTitle className="text-base">{d.data.name}</CardTitle>
                    <div className="text-xs text-slate-500">Timezone: {d.data.timezone}</div>
                  </div>
                  <Badge value={d.data.suspendedAt ? 'REVOKED' : 'ACTIVE'} />
                </div>

                {/* Quota Progress */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Monthly Quotas &amp; Utilization
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-850">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>AI Generations</span>
                      <span className="font-bold">
                        {d.data.usage.aiUsed} / {d.data.usage.aiLimit ?? 'Unlimited'}
                      </span>
                    </div>
                    {d.data.usage.aiLimit && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${Math.min(100, (d.data.usage.aiUsed / d.data.usage.aiLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-850">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Connected Accounts</span>
                      <span className="font-bold">
                        {d.data.usage.accountsUsed} / {d.data.usage.accountsLimit ?? 'Unlimited'}
                      </span>
                    </div>
                    {d.data.usage.accountsLimit && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (d.data.usage.accountsUsed / d.data.usage.accountsLimit) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Suspend / Reactivate Action */}
                <div>
                  {d.data.suspendedAt ? (
                    <ReasonDialog
                      trigger="Reactivate Workspace"
                      title="Reactivate this workspace?"
                      body="Workspace members regain full access and scheduled publishing will resume."
                      action="Reactivate"
                      destructive={false}
                      onSubmit={(reason) => act.mutate({ id: d.data!.id, op: 'reactivate', reason })}
                    />
                  ) : (
                    <ReasonDialog
                      trigger="Suspend Workspace"
                      title="Suspend this workspace?"
                      body="All members lose access immediately, and any pending scheduled posts will be held from publishing."
                      action="Suspend Workspace"
                      destructive={true}
                      onSubmit={(reason) => act.mutate({ id: d.data!.id, op: 'suspend', reason })}
                    />
                  )}
                </div>

                {/* Members List */}
                <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Workspace Members ({d.data.members.length})
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {d.data.members.map((m) => (
                      <li
                        key={m.user.id}
                        className="flex items-center justify-between rounded bg-slate-50 p-2 dark:bg-slate-850"
                      >
                        <div className="truncate">{m.user.email}</div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {m.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Connected Social Accounts */}
                <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Connected Channels ({d.data.socialAccounts.length})
                  </div>
                  {d.data.socialAccounts.length === 0 ? (
                    <p className="text-xs text-slate-400">No channels connected.</p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {d.data.socialAccounts.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between rounded border border-slate-100 p-2 dark:border-slate-800"
                        >
                          <div>
                            <div className="font-semibold">{a.displayName}</div>
                            <div className="text-[10px] text-slate-400">{a.platform}</div>
                          </div>
                          <Badge value={a.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
