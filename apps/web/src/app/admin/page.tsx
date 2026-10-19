'use client';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Link2,
  Send,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, Stat } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { Err, Unavail, useAdmin } from '@/components/admin/kit';
import { Badge } from '@/components/ui/badge';

interface O {
  rangeDays: number;
  users: {
    total: number;
    activeInRange: number;
    suspended: number;
    newInRange: number;
    signupsByDay: { date: string; count: number }[];
  };
  workspaces: { total: number; suspended: number };
  accounts: {
    total: number;
    byPlatformStatus: { platform: string; status: string; count: number }[];
  };
  posts: {
    scheduled: number;
    publishing: number;
    published: number;
    failed: number;
    drafts: number;
    publishedTargetsInRange: number;
  };
  publishing: { failedTargets: number; uncertainTargets: number; openTargets: number };
  ai: {
    generationsInRange: number;
    estimatedCost: { available: boolean; reason: string };
  };
  subscriptions: {
    active: number;
    byPlan: { plan: string; status: string; count: number }[];
  };
  revenue: { available: boolean; reason: string };
}

export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const q = useAdmin<O>(`/overview?days=${days}`);
  const d = q.data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            System Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time multi-tenant operations, user activity, and automated publishing metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none dark:text-slate-300"
              value={days}
              onChange={(e) => setDays(+e.target.value)}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      <Err e={q.error} />

      {d && (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Registered Users"
              value={d.users.total}
              hint={`${d.users.newInRange} joined in last ${days}d`}
              icon={<Users className="h-4 w-4" />}
            />
            <Stat
              label={`Active Users (${d.rangeDays}d)`}
              value={d.users.activeInRange}
              hint="Authenticated in range"
              icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
            />
            <Stat
              label="Total Workspaces"
              value={d.workspaces.total}
              hint={d.workspaces.suspended > 0 ? `${d.workspaces.suspended} suspended` : 'All healthy'}
              icon={<Building2 className="h-4 w-4 text-blue-600" />}
            />
            <Stat
              label="Connected Accounts"
              value={d.accounts.total}
              hint="Social media channels"
              icon={<Link2 className="h-4 w-4 text-purple-600" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Scheduled Posts"
              value={d.posts.scheduled}
              hint={`${d.posts.drafts} drafts saved`}
              icon={<Send className="h-4 w-4 text-sky-600" />}
            />
            <Stat
              label="Published Posts"
              value={d.posts.published}
              hint={`${d.posts.publishedTargetsInRange} account-posts in range`}
              icon={<FileCheck2 className="h-4 w-4 text-emerald-600" />}
            />
            <Stat
              label="Failed Publishing"
              value={d.publishing.failedTargets}
              hint={`${d.publishing.uncertainTargets} uncertain state`}
              icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
            />
            <Stat
              label="Active Subscriptions"
              value={d.subscriptions.active}
              hint="Paid recurring plans"
              icon={<CreditCard className="h-4 w-4 text-indigo-600" />}
            />
          </div>

          {/* Charts & Graphs */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Signups Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>User Growth &amp; Registrations</CardTitle>
                  <CardDescription>Daily verified user accounts created across the system</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{d.users.newInRange} new</span>
                </div>
              </CardHeader>

              {d.users.signupsByDay.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-xs text-slate-400">
                  No user registration activity recorded for this date range.
                </div>
              ) : (
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.users.signupsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* AI & Revenue Summary Card */}
            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <div>
                    <CardTitle>AI &amp; Financial Health</CardTitle>
                    <CardDescription>Intelligence engine volume and tier distributions</CardDescription>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </CardHeader>

                <div className="space-y-4 pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850">
                    <div className="text-xs font-medium text-slate-500">AI Generations (Range)</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {d.ai.generationsInRange.toLocaleString()}
                      </span>
                      <span className="text-xs text-purple-600 font-semibold">Gemini 3.5 Flash</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Estimated AI Cost</span>
                      <Unavail reason={d.ai.estimatedCost.reason} />
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Direct Payment Provider</span>
                      <Unavail reason={d.revenue.reason} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs dark:border-blue-900/30 dark:bg-blue-950/20">
                <div className="font-semibold text-blue-900 dark:text-blue-300">Subscription Status</div>
                <div className="mt-1 text-slate-600 dark:text-slate-400">
                  {d.subscriptions.byPlan.length
                    ? d.subscriptions.byPlan.map((p) => `${p.plan} (${p.status}) ×${p.count}`).join(', ')
                    : 'All customer workspaces currently operating on Free tier.'}
                </div>
              </div>
            </Card>
          </div>

          {/* Social Platforms Distribution */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Connected Accounts by Channel</CardTitle>
                <CardDescription>Social integration status across Meta, Instagram, and connected providers</CardDescription>
              </div>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>

            {d.accounts.byPlatformStatus.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No social accounts currently linked in customer workspaces.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pt-2">
                {d.accounts.byPlatformStatus.map((a) => (
                  <div
                    key={a.platform + a.status}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-850"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {a.platform}
                      </div>
                      <div className="mt-0.5">
                        <Badge value={a.status} />
                      </div>
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      {a.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
