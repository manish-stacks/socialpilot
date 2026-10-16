'use client';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle, Stat } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { Err, Unavail, useAdmin } from '@/components/admin/kit';

interface O { rangeDays: number; users: { total: number; activeInRange: number; suspended: number; newInRange: number; signupsByDay: { date: string; count: number }[] }; workspaces: { total: number; suspended: number };
  accounts: { total: number; byPlatformStatus: { platform: string; status: string; count: number }[] }; posts: { scheduled: number; publishing: number; published: number; failed: number; drafts: number; publishedTargetsInRange: number };
  publishing: { failedTargets: number; uncertainTargets: number; openTargets: number }; ai: { generationsInRange: number; estimatedCost: { available: boolean; reason: string } };
  subscriptions: { active: number; byPlan: { plan: string; status: string; count: number }[] }; revenue: { available: boolean; reason: string } }

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const q = useAdmin<O>(`/overview?days=${days}`);
  const d = q.data;
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Overview</h1>
        <Select className="w-40" value={days} onChange={(e) => setDays(+e.target.value)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select></div>
      <Err e={q.error} />
      {d && (<>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Registered users" value={d.users.total} hint={`${d.users.newInRange} new in range`} /><Stat label={`Active users (${d.rangeDays}d)`} value={d.users.activeInRange} hint="signed in during range" />
          <Stat label="Workspaces" value={d.workspaces.total} hint={`${d.workspaces.suspended} suspended`} /><Stat label="Connected accounts" value={d.accounts.total} />
          <Stat label="Scheduled posts" value={d.posts.scheduled} /><Stat label="Published posts" value={d.posts.published} hint={`${d.posts.publishedTargetsInRange} account-posts in range`} />
          <Stat label="Failed publishing" value={d.publishing.failedTargets} hint={`${d.publishing.uncertainTargets} uncertain`} /><Stat label="Active subscriptions" value={d.subscriptions.active} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardTitle>Sign-ups per day</CardTitle>{d.users.signupsByDay.length === 0 ? <p className="mt-3 text-sm text-neutral-500">No sign-ups in range.</p> :
            <div className="mt-3 h-52"><ResponsiveContainer><BarChart data={d.users.signupsByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="count" fill="#4f46e5" /></BarChart></ResponsiveContainer></div>}</Card>
          <Card><CardTitle>AI and revenue</CardTitle><ul className="mt-3 space-y-3 text-sm">
            <li>AI generations in range: <b>{d.ai.generationsInRange}</b></li><li>Estimated AI cost: <Unavail reason={d.ai.estimatedCost.reason} /></li><li>Revenue: <Unavail reason={d.revenue.reason} /></li>
            <li className="text-xs text-neutral-500">Subscriptions: {d.subscriptions.byPlan.length ? d.subscriptions.byPlan.map((p) => `${p.plan} (${p.status}) ×${p.count}`).join(', ') : 'none yet — all workspaces are on the free plan'}</li></ul></Card>
        </div>
        <Card><CardTitle>Connected accounts by platform</CardTitle>{d.accounts.byPlatformStatus.length === 0 ? <p className="mt-2 text-sm text-neutral-500">None.</p> :
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">{d.accounts.byPlatformStatus.map((a) => <li key={a.platform + a.status}>{a.platform} · {a.status.toLowerCase()}: <b>{a.count}</b></li>)}</ul>}</Card>
      </>)}
    </div>
  );
}
