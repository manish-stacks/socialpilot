'use client';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Card, CardTitle, Empty, Stat } from '@/components/ui/card';

interface Report {
  totals: { published: number; failed: number }; successRate: number | null;
  byDay: { date: string; published: number; failed: number }[]; byPlatform: { platform: string; published: number; failed: number }[];
  engagement: { available: boolean; reason: string };
}

export default function Analytics() {
  const { workspace } = useApp();
  const id = workspace?.id;
  const [days, setDays] = useState(30);
  const range = useMemo(() => { const to = new Date(Date.now() + 86_400_000); return { from: new Date(to.getTime() - (days + 1) * 86_400_000).toISOString(), to: to.toISOString() }; }, [days]);
  const q = useQuery({ queryKey: ['analytics', id, days], queryFn: () => api<Report>(wsPath(id!, `/analytics/overview?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`)), enabled: !!id });
  if (!workspace) return null;
  const d = q.data;
  const exportCsv = () => {
    if (!d) return;
    const rows = ['date,published,failed', ...d.byDay.map((r) => `${r.date},${r.published},${r.failed}`), '', 'platform,published,failed', ...d.byPlatform.map((r) => `${r.platform},${r.published},${r.failed}`)];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = `analytics-${days}d.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex gap-2"><Select className="w-36" value={days} onChange={(e) => setDays(+e.target.value)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select>
          <Button variant="outline" disabled={!d || (d.byDay.length === 0)} onClick={exportCsv}>Export CSV</Button></div></div>
      {q.error && <p className="text-sm text-red-600">{(q.error as Error).message}</p>}
      {d && (<>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Published targets" value={d.totals.published} /><Stat label="Failed targets" value={d.totals.failed} />
          <Stat label="Success rate" value={d.successRate === null ? '—' : `${Math.round(d.successRate * 100)}%`} hint={d.successRate === null ? 'No publishing results in this range' : undefined} />
        </div>
        <Card><CardTitle>Publishing results by day</CardTitle>
          {d.byDay.length === 0 ? <div className="mt-3"><Empty>No publishing results in this range yet.</Empty></div> :
            <div className="mt-3 h-64"><ResponsiveContainer><BarChart data={d.byDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Legend />
              <Bar dataKey="published" stackId="a" fill="#4f46e5" /><Bar dataKey="failed" stackId="a" fill="#dc2626" /></BarChart></ResponsiveContainer></div>}
        </Card>
        <Card><CardTitle>By platform</CardTitle>
          {d.byPlatform.length === 0 ? <div className="mt-3"><Empty>No data.</Empty></div> :
            <div className="mt-3 h-56"><ResponsiveContainer><BarChart data={d.byPlatform}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="platform" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip />
              <Bar dataKey="published" fill="#4f46e5" /><Bar dataKey="failed" fill="#dc2626" /></BarChart></ResponsiveContainer></div>}
        </Card>
        <Card><CardTitle>Engagement, impressions, followers</CardTitle>
          <p className="mt-2 text-sm text-neutral-500">Unavailable. {d.engagement.reason} These are not shown as zero because they aren't measured.</p></Card>
      </>)}
    </div>
  );
}
