'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { Err, Paged, Pager, ReasonDialog, Table, Td, Unavail, dt, useAdmin } from '@/components/admin/kit';

interface W { id: string; name: string; slug: string; createdAt: string; suspendedAt: string | null; plan: string; subscriptionStatus: string; _count: { members: number; socialAccounts: number; posts: number } }
interface D { id: string; name: string; timezone: string; suspendedAt: string | null; suspendedReason: string | null; plan: { name: string } | null; usage: { aiUsed: number; aiLimit: number | null; accountsUsed: number; accountsLimit: number | null };
  members: { role: string; user: { id: string; email: string; name: string; status: string } }[]; socialAccounts: { id: string; platform: string; displayName: string; status: string; tokenExpiresAt: string | null }[];
  postsByStatus: { status: string; count: number }[]; recentActivity: { id: string; action: string; createdAt: string }[]; abuseReports: { available: boolean; reason: string } }

export default function Workspaces() {
  const [q, setQ] = useState(''), [page, setPage] = useState(1), [sel, setSel] = useState<string | null>(null);
  const qc = useQueryClient();
  const list = useAdmin<Paged<W>>(`/workspaces?page=${page}&pageSize=20${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const d = useAdmin<D>(`/workspaces/${sel}`, !!sel);
  const act = useMutation({
    mutationFn: (v: { id: string; op: 'suspend' | 'reactivate'; reason: string }) => api(`/admin/workspaces/${v.id}/${v.op}`, { method: 'POST', body: JSON.stringify({ reason: v.reason }) }),
    onSuccess: () => { toast.success('Done'); qc.invalidateQueries({ queryKey: ['admin'] }); }, onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold">Workspaces</h1>
      <Input placeholder="Search name or slug…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /><Err e={list.error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3"><Table head={['Workspace', 'Plan', 'Members / accounts / posts', 'State']}>{list.data?.items.map((w) => (
          <tr key={w.id} onClick={() => setSel(w.id)} className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"><Td><div className="font-medium">{w.name}</div><div className="text-xs text-neutral-500">{dt(w.createdAt)}</div></Td>
            <Td>{w.plan}<div className="text-xs text-neutral-500">{w.subscriptionStatus}</div></Td><Td>{w._count.members} / {w._count.socialAccounts} / {w._count.posts}</Td>
            <Td>{w.suspendedAt ? <Badge value="REVOKED" /> : <Badge value="ACTIVE" />} <span className="text-xs text-neutral-500">{w.suspendedAt ? 'suspended' : 'active'}</span></Td></tr>))}</Table>
          {list.data && <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} set={setPage} />}</div>
        <Card className="h-fit">{!sel ? <p className="text-sm text-neutral-500">Select a workspace.</p> : d.data && (
          <div className="space-y-3 text-sm"><CardTitle>{d.data.name}</CardTitle>
            <ul className="space-y-1 text-xs"><li>Plan: {d.data.plan?.name ?? 'Free'}</li><li>Timezone: {d.data.timezone}</li><li>AI this month: {d.data.usage.aiUsed} / {d.data.usage.aiLimit ?? '—'}</li><li>Accounts: {d.data.usage.accountsUsed} / {d.data.usage.accountsLimit ?? '—'}</li>
              {d.data.suspendedAt && <li className="text-red-700">Suspended {dt(d.data.suspendedAt)}: {d.data.suspendedReason}</li>}</ul>
            {d.data.suspendedAt ? <ReasonDialog trigger="Reactivate workspace" title="Reactivate this workspace?" body="Members regain access and publishing resumes." action="Reactivate" destructive={false} onSubmit={(reason) => act.mutate({ id: d.data!.id, op: 'reactivate', reason })} />
              : <ReasonDialog trigger="Suspend workspace" title="Suspend this workspace?" body="Members lose API access to it and its scheduled posts stop publishing until reactivated." action="Suspend" onSubmit={(reason) => act.mutate({ id: d.data!.id, op: 'suspend', reason })} />}
            <div><h4 className="mb-1 text-xs font-medium text-neutral-500">Members</h4><ul className="space-y-0.5 text-xs">{d.data.members.map((m) => <li key={m.user.id}>{m.user.email} · {m.role.toLowerCase()}{m.user.status !== 'ACTIVE' && ' · suspended'}</li>)}</ul></div>
            <div><h4 className="mb-1 text-xs font-medium text-neutral-500">Connected accounts (no credentials shown)</h4>{d.data.socialAccounts.length === 0 ? <p className="text-xs text-neutral-500">None.</p> : <ul className="space-y-0.5 text-xs">{d.data.socialAccounts.map((a) => <li key={a.id}>{a.platform} · {a.displayName} · {a.status.toLowerCase()}</li>)}</ul>}</div>
            <div><h4 className="mb-1 text-xs font-medium text-neutral-500">Posts</h4><p className="text-xs">{d.data.postsByStatus.map((p) => `${p.status.toLowerCase()}: ${p.count}`).join(' · ') || 'none'}</p></div>
            <div><h4 className="mb-1 text-xs font-medium text-neutral-500">Abuse reports</h4><Unavail reason={d.data.abuseReports.reason} /></div></div>)}</Card>
      </div>
    </div>
  );
}
