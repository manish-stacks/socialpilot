'use client';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Err, useAdmin } from '@/components/admin/kit';

interface I { providers: { platform: string; implemented: boolean; configured: boolean; env: { name: string; set: boolean }[]; note: string; accounts: { status: string; count: number }[]; last24h: { ok: number; bad: number } }[];
  services: { name: string; ok?: boolean; configured?: boolean; detail?: string | null }[] }
export default function Integrations() {
  const q = useAdmin<I>('/integrations', true, 30000);
  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Integration status</h1><Err e={q.error} />
      <p className="text-sm text-neutral-500">Shows whether configuration is present, never its values. "Configured" does not mean approved: live publishing for external users still depends on provider app review.</p>
      {q.data && (<>
        <div className="grid gap-3 sm:grid-cols-2">{q.data.services.map((s) => { const good = s.ok ?? s.configured; return (
          <Card key={s.name} className="flex items-center justify-between text-sm"><div><div className="font-medium">{s.name}</div>{s.detail && <div className="text-xs text-neutral-500">{s.detail}</div>}</div>
            <Badge value={good ? 'ACTIVE' : s.ok === false ? 'ERROR' : 'PENDING'} className="" /></Card>); })}</div>
        <div className="grid gap-3 lg:grid-cols-2">{q.data.providers.map((p) => (
          <Card key={p.platform} className="space-y-2 text-sm"><div className="flex items-center justify-between"><CardTitle>{p.platform}</CardTitle><Badge value={!p.implemented ? 'CANCELLED' : p.configured ? 'ACTIVE' : 'PENDING'} className="" /></div>
            <p className="text-xs text-neutral-500">{p.implemented ? (p.configured ? 'Implemented and configured' : 'Implemented, not configured') : 'Not implemented'} · {p.note}</p>
            {p.env.length > 0 && <ul className="flex flex-wrap gap-2 text-xs">{p.env.map((e) => <li key={e.name} className={e.set ? 'text-green-700' : 'text-red-700'}>{e.set ? '✓' : '✗'} {e.name}</li>)}</ul>}
            <p className="text-xs">Accounts: {p.accounts.length ? p.accounts.map((a) => `${a.status.toLowerCase()} ${a.count}`).join(', ') : 'none'} · last 24h: {p.last24h.ok} ok / {p.last24h.bad} failed</p></Card>))}</div></>)}
    </div>
  );
}
