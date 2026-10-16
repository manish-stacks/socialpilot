'use client';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle, Stat } from '@/components/ui/card';
import { Select } from '@/components/ui/form';
import { Err, Table, Td, Unavail, useAdmin } from '@/components/admin/kit';

interface U { rangeDays: number; generationsLastMinute: number; byWorkspace: { workspaceId: string; name: string; plan: string; generations: number }[]; byMode: { mode: string; count: number }[]; byDay: { date: string; count: number }[];
  model: { name: string | null; configured: boolean; note: string }; estimatedCost: { reason: string } }
export default function Usage() {
  const [days, setDays] = useState(30); const q = useAdmin<U>(`/usage?days=${days}`); const d = q.data;
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Usage &amp; AI</h1><Select className="w-40" value={days} onChange={(e) => setDays(+e.target.value)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select></div><Err e={q.error} />
      {d && (<>
        <div className="grid grid-cols-3 gap-4"><Stat label="Generations in range" value={d.byDay.reduce((a, b) => a + b.count, 0)} /><Stat label="Last minute" value={d.generationsLastMinute} hint="rate-limit signal" /><Stat label="Model" value={<span className="text-base">{d.model.name ?? 'not set'}</span>} hint={d.model.configured ? 'configured' : 'API key/model missing'} /></div>
        <Card><CardTitle>Generations per day</CardTitle>{d.byDay.length === 0 ? <p className="mt-2 text-sm text-neutral-500">No generations in range.</p> : <div className="mt-3 h-52"><ResponsiveContainer><BarChart data={d.byDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="count" fill="#4f46e5" /></BarChart></ResponsiveContainer></div>}</Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <div><h2 className="mb-2 text-sm font-semibold">Top workspaces</h2><Table head={['Workspace', 'Plan', 'Generations']}>{d.byWorkspace.map((w) => <tr key={w.workspaceId}><Td>{w.name}</Td><Td>{w.plan}</Td><Td>{w.generations}</Td></tr>)}</Table></div>
          <div><h2 className="mb-2 text-sm font-semibold">By mode</h2><Table head={['Mode', 'Count']}>{d.byMode.map((m) => <tr key={m.mode}><Td>{m.mode}</Td><Td>{m.count}</Td></tr>)}</Table></div></div>
        <Card className="text-sm"><CardTitle>Cost &amp; configuration</CardTitle><p className="mt-2">Estimated cost: <Unavail reason={d.estimatedCost.reason} /></p><p className="mt-1 text-xs text-neutral-500">{d.model.note} Per-plan monthly limits are edited under Plans; the system prompt and the AI on/off flag are under System settings.</p></Card>
      </>)}
    </div>
  );
}
