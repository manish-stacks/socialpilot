'use client';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Bot,
  Brain,
  Calendar,
  Cpu,
  Layers,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle, Stat } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { Err, Table, Td, Unavail, useAdmin } from '@/components/admin/kit';
import { Badge } from '@/components/ui/badge';

interface U {
  rangeDays: number;
  generationsLastMinute: number;
  byWorkspace: { workspaceId: string; name: string; plan: string; generations: number }[];
  byMode: { mode: string; count: number }[];
  byDay: { date: string; count: number }[];
  model: { name: string | null; configured: boolean; note: string };
  estimatedCost: { reason: string };
}

export default function UsagePage() {
  const [days, setDays] = useState(30);
  const q = useAdmin<U>(`/usage?days=${days}`);
  const d = q.data;

  const totalGenerations = d?.byDay.reduce((a, b) => a + b.count, 0) ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            AI Engine &amp; Utilization
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor Gemini AI generation volumes, request frequency, and tenant consumption patterns.
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
          {/* Key Metric Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label={`Generations in ${days} Days`}
              value={totalGenerations.toLocaleString()}
              hint="Prompt completions created"
              icon={<Sparkles className="h-4 w-4 text-purple-600" />}
            />
            <Stat
              label="Real-Time Velocity"
              value={`${d.generationsLastMinute} / min`}
              hint="Current burst throughput"
              icon={<Zap className="h-4 w-4 text-amber-500" />}
            />
            <Stat
              label="Active AI Model"
              value={d.model.name ?? 'Not set'}
              hint={d.model.configured ? 'API connection healthy' : 'Key missing in environment'}
              icon={<Bot className="h-4 w-4 text-blue-600" />}
            />
          </div>

          {/* Daily Generations Chart */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Daily AI Generation Activity</CardTitle>
                <CardDescription>Number of social captions and post ideas generated per day</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-xs text-slate-500">Generations</span>
              </div>
            </CardHeader>

            {d.byDay.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-xs text-slate-400">
                No AI generation events recorded in this time range.
              </div>
            ) : (
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.byDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
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
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fill="url(#areaGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Leaderboards and Mode Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Workspaces */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Top Consumer Workspaces
                </h2>
                <span className="text-xs text-slate-400">By generations</span>
              </div>
              <Table head={['Workspace', 'Plan', 'Generations']}>
                {d.byWorkspace.length === 0 ? (
                  <tr>
                    <Td className="text-center text-slate-400" children="No workspace usage yet." />
                  </tr>
                ) : (
                  d.byWorkspace.map((w) => (
                    <tr key={w.workspaceId}>
                      <Td className="font-semibold text-slate-900 dark:text-slate-100">{w.name}</Td>
                      <Td>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
                          {w.plan}
                        </span>
                      </Td>
                      <Td className="font-bold text-blue-600 dark:text-blue-400">
                        {w.generations.toLocaleString()}
                      </Td>
                    </tr>
                  ))
                )}
              </Table>
            </div>

            {/* By Mode */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Generations by Mode
                </h2>
                <span className="text-xs text-slate-400">Task distribution</span>
              </div>
              <Table head={['Execution Mode', 'Requests']}>
                {d.byMode.length === 0 ? (
                  <tr>
                    <Td className="text-center text-slate-400" children="No modes recorded." />
                  </tr>
                ) : (
                  d.byMode.map((m) => (
                    <tr key={m.mode}>
                      <Td className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                        {m.mode}
                      </Td>
                      <Td className="font-bold text-slate-800 dark:text-slate-200">
                        {m.count.toLocaleString()}
                      </Td>
                    </tr>
                  ))
                )}
              </Table>
            </div>
          </div>

          {/* Model Configuration & Cost Box */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>AI Provider Integration &amp; Cost Control</CardTitle>
                <CardDescription>Direct Google Gemini API connection architecture</CardDescription>
              </div>
              <Cpu className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-xs text-slate-500">Estimated LLM Infrastructure Cost</span>
                <Unavail reason={d.estimatedCost.reason} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {d.model.note} Per-plan allowances are managed under Plans &amp; Subscriptions. System-wide
                prompt directives and maintenance overrides can be modified in System Settings.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
