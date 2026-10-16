'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/form';
import { Err, Paged, Pager, ReasonDialog, Table, Td, dt, useAdmin } from '@/components/admin/kit';

interface U { id: string; email: string; name: string; systemRole: string; status: string; createdAt: string; emailVerifiedAt: string | null; workspaces: { id: string; name: string; role: string; plan: string }[] }
interface Detail extends U { activeSessions: number; lastSignInAt: string | null; usage: { aiGenerations30d: number; postsCreated: number }; recentActivity: { id: string; action: string; createdAt: string; metadata: unknown }[] }

export default function Users() {
  const [q, setQ] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1), [sel, setSel] = useState<string | null>(null);
  const qc = useQueryClient();
  const list = useAdmin<Paged<U>>(`/users?page=${page}&pageSize=20${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const detail = useAdmin<Detail>(`/users/${sel}`, !!sel);
  const act = useMutation({
    mutationFn: (v: { id: string; op: 'suspend' | 'reactivate'; reason: string }) => api(`/admin/users/${v.id}/${v.op}`, { method: 'POST', body: JSON.stringify({ reason: v.reason }) }),
    onSuccess: () => { toast.success('Done'); qc.invalidateQueries({ queryKey: ['admin'] }); }, onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="flex gap-2"><Input placeholder="Search name or email…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select className="w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option></Select></div>
      <Err e={list.error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Table head={['User', 'Status', 'Workspaces / plan', 'Joined']}>{list.data?.items.map((u) => (
            <tr key={u.id} onClick={() => setSel(u.id)} className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900">
              <Td><div className="font-medium">{u.name}</div><div className="text-xs text-neutral-500">{u.email}{u.systemRole === 'ADMIN' && ' · admin'}</div></Td>
              <Td><Badge value={u.status === 'ACTIVE' ? 'ACTIVE' : 'REVOKED'} className="" /> <span className="text-xs text-neutral-500">{u.status.toLowerCase()}</span></Td>
              <Td className="text-xs">{u.workspaces.map((w) => `${w.name} (${w.role.toLowerCase()}, ${w.plan})`).join('; ') || '—'}</Td><Td className="text-xs">{dt(u.createdAt)}</Td></tr>))}</Table>
          {list.data && <Pager page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} set={setPage} />}
        </div>
        <Card className="h-fit">{!sel ? <p className="text-sm text-neutral-500">Select a user to see details.</p> : detail.isLoading ? <p className="text-sm text-neutral-500">Loading…</p> : detail.data && (
          <div className="space-y-3 text-sm"><div><CardTitle>{detail.data.name}</CardTitle><div className="text-xs text-neutral-500">{detail.data.email}</div></div>
            <ul className="space-y-1 text-xs"><li>Status: <b>{detail.data.status.toLowerCase()}</b></li><li>Email verified: {detail.data.emailVerifiedAt ? dt(detail.data.emailVerifiedAt) : 'no'}</li><li>Last sign-in: {dt(detail.data.lastSignInAt)}</li>
              <li>Active sessions: {detail.data.activeSessions}</li><li>AI generations (30d): {detail.data.usage.aiGenerations30d}</li><li>Posts created: {detail.data.usage.postsCreated}</li></ul>
            {detail.data.systemRole !== 'ADMIN' && (detail.data.status === 'ACTIVE'
              ? <ReasonDialog trigger="Suspend user" title={`Suspend ${detail.data.email}?`} body="They are signed out everywhere immediately and cannot sign in until reactivated." action="Suspend" onSubmit={(reason) => act.mutate({ id: detail.data!.id, op: 'suspend', reason })} />
              : <ReasonDialog trigger="Reactivate user" title={`Reactivate ${detail.data.email}?`} body="They will be able to sign in again." action="Reactivate" destructive={false} onSubmit={(reason) => act.mutate({ id: detail.data!.id, op: 'reactivate', reason })} />)}
            <div><h4 className="mb-1 text-xs font-medium text-neutral-500">Recent activity</h4>{detail.data.recentActivity.length === 0 ? <p className="text-xs text-neutral-500">None.</p> :
              <ul className="space-y-1 text-xs">{detail.data.recentActivity.map((a) => <li key={a.id}>{dt(a.createdAt)} · {a.action}</li>)}</ul>}</div>
            <p className="text-[11px] text-neutral-500">Passwords and OAuth tokens are never available to admins.</p></div>)}</Card>
      </div>
    </div>
  );
}
