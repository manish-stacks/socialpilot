'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';

interface Plan { id: string; code: string; name: string; priceCents: number; aiCreditsPerMonth: number; maxAccounts: number }
interface Billing { plan: Plan; status: string; billingProviderConfigured: boolean; usage: { aiUsed: number; aiLimit: number; accountsUsed: number; accountsLimit: number } }

export default function BillingPage() {
  const { workspace } = useApp();
  const id = workspace?.id;
  const plans = useQuery({ queryKey: ['plans', id], queryFn: () => api<Plan[]>(wsPath(id!, '/billing/plans')), enabled: !!id });
  const b = useQuery({ queryKey: ['billing', id], queryFn: () => api<Billing>(wsPath(id!, '/billing')), enabled: !!id });
  if (!workspace || !b.data) return <p className="text-sm text-neutral-500">{b.error ? (b.error as Error).message : 'Loading…'}</p>;
  const { usage } = b.data;
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card><CardTitle>Current plan: {b.data.plan.name}</CardTitle>
        <p className="mt-1 text-sm text-neutral-500">Status: {b.data.status}</p>
        <ul className="mt-3 space-y-1 text-sm"><li>AI generations this month: {usage.aiUsed} / {usage.aiLimit}</li><li>Connected accounts: {usage.accountsUsed} / {usage.accountsLimit}</li></ul>
      </Card>
      {!b.data.billingProviderConfigured && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">No payment provider is configured, so plan changes are unavailable. Limits above are enforced, but no real billing is active.</p>}
      <div className="grid gap-4 md:grid-cols-4">{plans.data?.map((p) => (
        <Card key={p.id} className={p.code === b.data.plan.code ? 'border-indigo-600' : ''}>
          <CardTitle>{p.name}</CardTitle>
          <div className="mt-2 text-2xl font-semibold">{p.priceCents === 0 ? 'Free' : `$${p.priceCents / 100}`}<span className="text-xs font-normal text-neutral-500">{p.priceCents ? '/mo' : ''}</span></div>
          <ul className="mt-3 space-y-1 text-xs text-neutral-500"><li>{p.aiCreditsPerMonth} AI generations / mo</li><li>{p.maxAccounts} connected accounts</li></ul>
          <Button className="mt-4 w-full" variant="outline" size="sm" disabled>{p.code === b.data.plan.code ? 'Current plan' : 'Unavailable'}</Button>
        </Card>))}</div>
      <p className="text-xs text-neutral-500">Prices shown are placeholder plan data stored in the database, not final pricing.</p>
    </div>
  );
}
