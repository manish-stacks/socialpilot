'use client';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileCheck2,
  Share2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Card, CardDescription, CardHeader, CardTitle, Empty, Stat } from '@/components/ui/card';

interface Report {
  totals: { published: number; failed: number };
  successRate: number | null;
  byDay: { date: string; published: number; failed: number }[];
  byPlatform: { platform: string; published: number; failed: number }[];
  engagement: { available: boolean; reason: string };
}

export default function AnalyticsPage() {
  const { workspace } = useApp();
  const id = workspace?.id;
  const [days, setDays] = useState(30);

  const range = useMemo(() => {
    const to = new Date(Date.now() + 86_400_000);
    return {
      from: new Date(to.getTime() - (days + 1) * 86_400_000).toISOString(),
      to: to.toISOString(),
    };
  }, [days]);

  const q = useQuery({
    queryKey: ['analytics', id, days],
    queryFn: () =>
      api<Report>(
        wsPath(
          id!,
          `/analytics/overview?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(
            range.to
          )}`
        )
      ),
    enabled: !!id,
  });

  if (!workspace) return null;
  const d = q.data;

  const exportCsv = () => {
    if (!d) return;
    const rows = [
      'date,published,failed',
      ...d.byDay.map((r) => `${r.date},${r.published},${r.failed}`),
      '',
      'platform,published,failed',
      ...d.byPlatform.map((r) => `${r.platform},${r.published},${r.failed}`),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = `analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Publishing Analytics &amp; Delivery
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track automated distribution reliability, delivery success rates, and cross-channel volumes.
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
          <Button
            variant="outline"
            size="sm"
            disabled={!d || d.byDay.length === 0}
            onClick={exportCsv}
            className="h-8"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {q.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {(q.error as Error).message}
        </div>
      )}

      {d && (
        <>
          {/* Key KPI Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="Published Targets"
              value={d.totals.published.toLocaleString()}
              hint="Delivered to social APIs"
              icon={<FileCheck2 className="h-4 w-4 text-emerald-600" />}
            />
            <Stat
              label="Failed Targets"
              value={d.totals.failed.toLocaleString()}
              hint="Provider API errors"
              icon={<XCircle className="h-4 w-4 text-rose-600" />}
            />
            <Stat
              label="Delivery Success Rate"
              value={d.successRate === null ? '—' : `${Math.round(d.successRate * 100)}%`}
              hint={d.successRate === null ? 'No post attempts in range' : 'Overall dispatch health'}
              icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
            />
          </div>

          {/* Daily Stacked Results */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Daily Publishing Output</CardTitle>
                <CardDescription>Successful vs failed social targets per calendar day</CardDescription>
              </div>
            </CardHeader>

            {d.byDay.length === 0 ? (
              <Empty className="my-4">No publishing results recorded for this date range.</Empty>
            ) : (
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.byDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="published" name="Published" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} barSize={24} />
                    <Bar dataKey="failed" name="Failed" stackId="a" fill="#e11d48" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* By Platform & Engagement */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Volume by Social Network</CardTitle>
                  <CardDescription>Target distribution breakdown</CardDescription>
                </div>
                <Share2 className="h-4 w-4 text-slate-400" />
              </CardHeader>

              {d.byPlatform.length === 0 ? (
                <Empty className="my-4">No platform data in range.</Empty>
              ) : (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.byPlatform} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="platform" fontSize={11} tickLine={false} axisLine={false} />
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
                      <Bar dataKey="published" name="Published" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" name="Failed" fill="#e11d48" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <CardHeader>
                  <div>
                    <CardTitle>Engagement &amp; Audience Reach</CardTitle>
                    <CardDescription>Third-party audience impressions telemetry</CardDescription>
                  </div>
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <div className="pt-2 text-xs text-slate-500 leading-relaxed space-y-2">
                  <p>
                    Third-party impressions, comments, and follower metrics are currently{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Unavailable</span>.
                  </p>
                  <p>{d.engagement.reason}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-850">
                Data reflects verified publishing receipts from official platform APIs.
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
