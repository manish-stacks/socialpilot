'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/form';
import { Err, Paged, Pager, Table, Td, useAdmin } from '@/components/admin/kit';

interface Plan { id: string; code: string; name: string; priceCents: number; aiCreditsPerMonth: number; maxAccounts: number; active: boolean; subscriptions: number }
interface Sub { id: string; status: string; currentPeriodEnd: string | null; workspace: { id: string; name: string }; plan: { name: string; priceCents: number } }
interface Subs extends Paged<Sub> { webhooks: { configured: boolean; provider: string | null; eventsRecorded: number; note: string } }
const empty = { code: '', name: '', priceCents: 0, aiCreditsPerMonth: 20, maxAccounts: 2 };

export default function Billing() {
  const qc = useQueryClient(), [page, setPage] = useState(1), [form, setForm] = useState(empty), [edit, setEdit] = useState<Plan | null>(null);
  const plans = useAdmin<Plan[]>('/plans'), subs = useAdmin<Subs>(`/subscriptions?page=${page}&pageSize=15`);
  const done = () => { qc.invalidateQueries({ queryKey: ['admin'] }); toast.success('Saved'); };
  const create = useMutation({ mutationFn: () => api('/admin/plans', { method: 'POST', body: JSON.stringify(form) }), onSuccess: () => { done(); setForm(empty); }, onError: (e) => toast.error((e as Error).message) });
  const update = useMutation({ mutationFn: (p: Plan) => api(`/admin/plans/${p.id}`, { method: 'PATCH', body: JSON.stringify({ name: p.name, priceCents: p.priceCents, aiCreditsPerMonth: p.aiCreditsPerMonth, maxAccounts: p.maxAccounts, active: p.active }) }), onSuccess: () => { done(); setEdit(null); }, onError: (e) => toast.error((e as Error).message) });
  const num = (v: string) => (v === '' ? 0 : Number(v));
  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Plans &amp; subscriptions</h1><Err e={plans.error} />
      <Table head={['Plan', 'Price / mo', 'AI credits / mo', 'Max accounts', 'Subscriptions', 'Status', '']}>{plans.data?.map((p) => (
        <tr key={p.id}>{edit?.id === p.id ? (<>
          <Td><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><div className="mt-1 text-xs text-neutral-500">{p.code}</div></Td>
          <Td><Input type="number" value={edit.priceCents} onChange={(e) => setEdit({ ...edit, priceCents: num(e.target.value) })} /><span className="text-xs text-neutral-500">cents</span></Td>
          <Td><Input type="number" value={edit.aiCreditsPerMonth} onChange={(e) => setEdit({ ...edit, aiCreditsPerMonth: num(e.target.value) })} /></Td>
          <Td><Input type="number" value={edit.maxAccounts} onChange={(e) => setEdit({ ...edit, maxAccounts: num(e.target.value) })} /></Td><Td>{p.subscriptions}</Td>
          <Td><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={edit.active} disabled={p.code === 'free'} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />active</label></Td>
          <Td><div className="flex gap-1"><Button size="sm" disabled={update.isPending} onClick={() => update.mutate(edit)}>Save</Button><Button size="sm" variant="outline" onClick={() => setEdit(null)}>Cancel</Button></div></Td></>) : (<>
          <Td><div className="font-medium">{p.name}</div><div className="text-xs text-neutral-500">{p.code}</div></Td><Td>${(p.priceCents / 100).toFixed(2)}</Td><Td>{p.aiCreditsPerMonth}</Td><Td>{p.maxAccounts}</Td><Td>{p.subscriptions}</Td><Td>{p.active ? 'active' : 'inactive'}</Td>
          <Td><Button size="sm" variant="outline" onClick={() => setEdit(p)}>Edit</Button></Td></>)}</tr>))}</Table>
      <Card><CardTitle>Create plan</CardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <div><Label>Code</Label><Input placeholder="team" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} /></div><div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Price (cents)</Label><Input type="number" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: num(e.target.value) })} /></div>
          <div><Label>AI credits / mo</Label><Input type="number" value={form.aiCreditsPerMonth} onChange={(e) => setForm({ ...form, aiCreditsPerMonth: num(e.target.value) })} /></div>
          <div><Label>Max accounts</Label><Input type="number" value={form.maxAccounts} onChange={(e) => setForm({ ...form, maxAccounts: num(e.target.value) })} /></div></div>
        <Button className="mt-3" disabled={create.isPending || !form.code || !form.name} onClick={() => create.mutate()}>Create plan</Button>
        <p className="mt-2 text-xs text-neutral-500">Changing a plan changes limits immediately for every workspace on it. Prices are metadata only; no payment provider is connected.</p></Card>
      <div><h2 className="mb-2 text-lg font-semibold">Subscriptions</h2>
        {subs.data && <Card className="mb-3 text-sm"><CardTitle>Payment webhook status</CardTitle><p className="mt-1">Provider: {subs.data.webhooks.provider ?? 'none configured'} · events recorded: {subs.data.webhooks.eventsRecorded}</p><p className="mt-1 text-xs text-neutral-500">{subs.data.webhooks.note}</p></Card>}
        {subs.data?.items.length === 0 ? <p className="text-sm text-neutral-500">No paid subscriptions exist. Workspaces without a subscription use the free plan.</p> : <>
          <Table head={['Workspace', 'Plan', 'Status', 'Period end']}>{subs.data?.items.map((s) => <tr key={s.id}><Td>{s.workspace.name}</Td><Td>{s.plan.name}</Td><Td>{s.status}</Td><Td className="text-xs">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</Td></tr>)}</Table>
          {subs.data && <Pager page={subs.data.page} pageSize={subs.data.pageSize} total={subs.data.total} set={setPage} />}</>}
        <p className="mt-2 text-xs text-neutral-500">Subscriptions are read-only here: they change only via verified payment-provider webhooks.</p></div>
    </div>
  );
}
