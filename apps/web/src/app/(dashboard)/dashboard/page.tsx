'use client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, Workspace } from '@/lib/api';
import { workspaceSchema } from '@/lib/schemas';
import { useApp } from '@/lib/app-context';
import { fmt } from '@/lib/time';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, Empty, Stat } from '@/components/ui/card';

interface Overview {
  counts: { accounts: number; published: number; scheduled: number; drafts: number; failed: number };
  upcoming: { id: string; caption: string; scheduledAt: string }[];
  recent: { id: string; caption: string; status: string; updatedAt: string }[];
  aiRecent: { id: string; mode: string; prompt: string; createdAt: string }[];
  usage: { aiUsed: number; aiLimit: number; accountsUsed: number; accountsLimit: number };
  plan: string; platformDistribution: { platform: string; targets: number }[];
}

function CreateWorkspace() {
  const { select } = useApp();
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<{ name: string; timezone: string }>({
    resolver: zodResolver(workspaceSchema), defaultValues: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });
  const create = useMutation({
    mutationFn: (v: object) => api<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: (w) => { qc.invalidateQueries({ queryKey: ['workspaces'] }); select(w.id); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card className="max-w-md">
      <h1 className="text-xl font-semibold">Create your first workspace</h1>
      <p className="mb-4 mt-1 text-sm text-neutral-500">Workspaces separate teams and clients.</p>
      <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
        <Input placeholder="Workspace name" {...register('name')} /><p className="text-xs text-red-600">{errors.name?.message}</p>
        <Input placeholder="Timezone (IANA, e.g. Asia/Kolkata)" {...register('timezone')} />
        <Button disabled={create.isPending}>Create workspace</Button>
      </form>
    </Card>
  );
}

export default function Overview() {
  const { workspace } = useApp();
  const id = workspace?.id;
  const q = useQuery({ queryKey: ['dashboard', id], queryFn: () => api<Overview>(wsPath(id!, '/dashboard')), enabled: !!id });
  if (!workspace) return <CreateWorkspace />;
  if (q.isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (q.error || !q.data) return <p className="text-sm text-red-600">{(q.error as Error)?.message ?? 'Failed to load'}</p>;
  const d = q.data, tz = workspace.timezone;
  const total = d.platformDistribution.reduce((a, b) => a + b.targets, 0);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">{workspace.name}</h1><p className="text-sm text-neutral-500">{d.plan} plan · timezone {tz}</p></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Connected accounts" value={d.counts.accounts} />
        <Stat label="Published" value={d.counts.published} />
        <Stat label="Scheduled" value={d.counts.scheduled} />
        <Stat label="Drafts" value={d.counts.drafts} />
        <Stat label="Failed" value={d.counts.failed} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardTitle>Upcoming scheduled</CardTitle>
          {d.upcoming.length === 0 ? <div className="mt-3"><Empty>Nothing scheduled. <Link className="underline" href="/posts/new">Create a post</Link></Empty></div> :
            <ul className="mt-3 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">{d.upcoming.map((p) => (
              <li key={p.id} className="py-2"><Link href={`/posts/${p.id}`} className="line-clamp-1 hover:underline">{p.caption || '(no caption)'}</Link><div className="text-xs text-neutral-500">{fmt(p.scheduledAt, tz)}</div></li>))}</ul>}
        </Card>
        <Card><CardTitle>Recent activity</CardTitle>
          {d.recent.length === 0 ? <div className="mt-3"><Empty>No posts yet.</Empty></div> :
            <ul className="mt-3 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">{d.recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2"><Link href={`/posts/${p.id}`} className="line-clamp-1 hover:underline">{p.caption || '(no caption)'}</Link><Badge value={p.status} /></li>))}</ul>}
        </Card>
        <Card><CardTitle>Platform distribution</CardTitle>
          {total === 0 ? <div className="mt-3"><Empty>No post targets yet.</Empty></div> :
            <ul className="mt-3 space-y-2 text-sm">{d.platformDistribution.map((p) => (
              <li key={p.platform}><div className="flex justify-between"><span>{p.platform}</span><span>{p.targets}</span></div>
                <div className="h-1.5 rounded bg-neutral-200 dark:bg-neutral-800"><div className="h-1.5 rounded bg-indigo-600" style={{ width: `${(p.targets / total) * 100}%` }} /></div></li>))}</ul>}
        </Card>
        <Card><CardTitle>Plan usage</CardTitle>
          <ul className="mt-3 space-y-3 text-sm">
            {([['AI generations this month', d.usage.aiUsed, d.usage.aiLimit], ['Connected accounts', d.usage.accountsUsed, d.usage.accountsLimit]] as const).map(([l, u, m]) => (
              <li key={l}><div className="flex justify-between"><span>{l}</span><span>{u} / {m}</span></div>
                <div className="h-1.5 rounded bg-neutral-200 dark:bg-neutral-800"><div className="h-1.5 rounded bg-indigo-600" style={{ width: `${Math.min(100, (u / m) * 100)}%` }} /></div></li>))}
          </ul>
          <h4 className="mt-5 text-xs font-medium text-neutral-500">Recent AI generations</h4>
          {d.aiRecent.length === 0 ? <p className="mt-1 text-xs text-neutral-500">None yet.</p> :
            <ul className="mt-1 space-y-1 text-xs">{d.aiRecent.map((a) => <li key={a.id} className="line-clamp-1">{a.mode}: {a.prompt}</li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}
