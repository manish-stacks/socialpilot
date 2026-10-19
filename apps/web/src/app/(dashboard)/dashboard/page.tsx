'use client';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Link2,
  Plus,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { api, Workspace } from '@/lib/api';
import { workspaceSchema } from '@/lib/schemas';
import { useApp } from '@/lib/app-context';
import { fmt } from '@/lib/time';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle, Empty, Stat } from '@/components/ui/card';

interface Overview {
  counts: { accounts: number; published: number; scheduled: number; drafts: number; failed: number };
  upcoming: { id: string; caption: string; scheduledAt: string }[];
  recent: { id: string; caption: string; status: string; updatedAt: string }[];
  aiRecent: { id: string; mode: string; prompt: string; createdAt: string }[];
  usage: { aiUsed: number; aiLimit: number; accountsUsed: number; accountsLimit: number };
  plan: string;
  platformDistribution: { platform: string; targets: number }[];
}

function CreateWorkspace() {
  const { select } = useApp();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ name: string; timezone: string }>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });

  const create = useMutation({
    mutationFn: (v: object) => api<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      select(w.id);
      toast.success('Workspace created successfully!');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card className="shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Create your primary workspace
        </h1>
        <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
          Workspaces isolate social channels, automated post queues, and team permissions.
        </p>

        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4" noValidate>
          <div>
            <Label>Workspace Name</Label>
            <Input placeholder="e.g. Acme Marketing" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Timezone</Label>
            <Input placeholder="IANA Timezone" {...register('timezone')} />
            {errors.timezone && <p className="mt-1 text-xs text-rose-600">{errors.timezone.message}</p>}
          </div>

          <Button variant="brand" className="w-full" disabled={create.isPending}>
            {create.isPending ? 'Setting up workspace…' : 'Get Started'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function OverviewPage() {
  const { workspace } = useApp();
  const id = workspace?.id;

  const q = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => api<Overview>(wsPath(id!, '/dashboard')),
    enabled: !!id,
  });

  if (!workspace) return <CreateWorkspace />;

  if (q.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Synchronizing workspace dashboard…</span>
        </div>
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        {(q.error as Error)?.message ?? 'Failed to load workspace overview'}
      </div>
    );
  }

  const d = q.data;
  const tz = workspace.timezone;
  const total = d.platformDistribution.reduce((a, b) => a + b.targets, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 md:p-8 text-white shadow-lg shadow-blue-500/10">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{d.plan.toUpperCase()} TIER WORKSPACE</span>
            </div>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {workspace.name}
            </h1>
            <p className="mt-1 text-xs md:text-sm text-blue-100 max-w-xl">
              Publishing is automated according to your timezone schedule ({tz}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-white text-blue-700 shadow-md hover:bg-slate-100 hover:text-blue-800 font-bold"
            >
              <Link href="/posts/new">
                <Plus className="h-4 w-4" />
                <span>Create New Post</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
            >
              <Link href="/ai-studio">
                <Sparkles className="h-4 w-4" />
                <span>AI Studio</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat
          label="Channels"
          value={d.counts.accounts}
          hint="Connected profiles"
          icon={<Link2 className="h-4 w-4 text-purple-600" />}
        />
        <Stat
          label="Published"
          value={d.counts.published}
          hint="Live social posts"
          icon={<FileCheck2 className="h-4 w-4 text-emerald-600" />}
        />
        <Stat
          label="Scheduled"
          value={d.counts.scheduled}
          hint="Queued in timeline"
          icon={<Calendar className="h-4 w-4 text-blue-600" />}
        />
        <Stat
          label="Drafts"
          value={d.counts.drafts}
          hint="Unpublished drafts"
          icon={<FileText className="h-4 w-4 text-slate-500" />}
        />
        <Stat
          label="Failed"
          value={d.counts.failed}
          hint="Requires attention"
          icon={<XCircle className="h-4 w-4 text-rose-600" />}
        />
      </div>

      {/* Main Grid: Scheduled & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Scheduled Posts */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle>Upcoming Scheduled Posts</CardTitle>
                <CardDescription>Queued to publish automatically to social networks</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-blue-600">
                <Link href="/calendar">View Calendar →</Link>
              </Button>
            </CardHeader>

            {d.upcoming.length === 0 ? (
              <Empty
                icon={<Clock className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
                className="mt-3"
              >
                <p>No upcoming posts scheduled.</p>
                <Link href="/posts/new" className="mt-2 text-xs font-semibold text-blue-600 underline">
                  Schedule your first post
                </Link>
              </Empty>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {d.upcoming.map((p) => (
                  <li key={p.id} className="py-3">
                    <Link href={`/posts/${p.id}`} className="group block">
                      <div className="line-clamp-1 font-semibold text-slate-800 group-hover:text-blue-600 dark:text-slate-200">
                        {p.caption || '(Untitled post)'}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{fmt(p.scheduledAt, tz)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle>Recent Publishing Activity</CardTitle>
                <CardDescription>Latest status updates across social channels</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-blue-600">
                <Link href="/posts">All Posts →</Link>
              </Button>
            </CardHeader>

            {d.recent.length === 0 ? (
              <Empty
                icon={<Activity className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
                className="mt-3"
              >
                No publishing activity yet.
              </Empty>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {d.recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <Link
                      href={`/posts/${p.id}`}
                      className="line-clamp-1 font-medium text-slate-800 hover:text-blue-600 dark:text-slate-200"
                    >
                      {p.caption || '(Untitled post)'}
                    </Link>
                    <Badge value={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Platform Target Distribution */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Target Platform Distribution</CardTitle>
              <CardDescription>Breakdown of posts across social channels</CardDescription>
            </div>
            <Share2 className="h-4 w-4 text-slate-400" />
          </CardHeader>

          {total === 0 ? (
            <Empty className="mt-3">No platform targets configured yet.</Empty>
          ) : (
            <div className="space-y-3 pt-2">
              {d.platformDistribution.map((p) => (
                <div key={p.platform} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{p.platform}</span>
                    <span>
                      {p.targets} ({Math.round((p.targets / total) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      style={{ width: `${(p.targets / total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Plan Usage & Quotas */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Monthly Plan Quota &amp; Consumption</CardTitle>
              <CardDescription>Available AI credits and channel capacities</CardDescription>
            </div>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </CardHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>AI Studio Generations</span>
                <span className="font-mono">
                  {d.usage.aiUsed} / {d.usage.aiLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-600"
                  style={{ width: `${Math.min(100, (d.usage.aiUsed / d.usage.aiLimit) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Connected Social Accounts</span>
                <span className="font-mono">
                  {d.usage.accountsUsed} / {d.usage.accountsLimit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(100, (d.usage.accountsUsed / d.usage.accountsLimit) * 100)}%` }}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Recent AI Ideas
              </div>
              {d.aiRecent.length === 0 ? (
                <p className="text-xs text-slate-400">No AI prompts run this month.</p>
              ) : (
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {d.aiRecent.slice(0, 3).map((a) => (
                    <li key={a.id} className="truncate">
                      <span className="font-semibold text-purple-600 capitalize">{a.mode}:</span>{' '}
                      {a.prompt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
