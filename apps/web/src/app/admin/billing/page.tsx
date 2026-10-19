'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  CreditCard,
  Edit2,
  Plus,
  Radio,
  Sparkles,
  Users,
  Webhook,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/form';
import { Err, Paged, Pager, Table, Td, useAdmin } from '@/components/admin/kit';
import { Badge } from '@/components/ui/badge';

interface Plan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  aiCreditsPerMonth: number;
  maxAccounts: number;
  active: boolean;
  subscriptions: number;
}

interface Sub {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  workspace: { id: string; name: string };
  plan: { name: string; priceCents: number };
}

interface Subs extends Paged<Sub> {
  webhooks: {
    configured: boolean;
    provider: string | null;
    eventsRecorded: number;
    note: string;
  };
}

const empty = { code: '', name: '', priceCents: 0, aiCreditsPerMonth: 20, maxAccounts: 2 };

export default function BillingPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty);
  const [edit, setEdit] = useState<Plan | null>(null);

  const plans = useAdmin<Plan[]>('/plans');
  const subs = useAdmin<Subs>(`/subscriptions?page=${page}&pageSize=15`);

  const done = () => {
    qc.invalidateQueries({ queryKey: ['admin'] });
    toast.success('Plan configuration updated');
  };

  const create = useMutation({
    mutationFn: () => api('/admin/plans', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      done();
      setForm(empty);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const update = useMutation({
    mutationFn: (p: Plan) =>
      api(`/admin/plans/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: p.name,
          priceCents: p.priceCents,
          aiCreditsPerMonth: p.aiCreditsPerMonth,
          maxAccounts: p.maxAccounts,
          active: p.active,
        }),
      }),
    onSuccess: () => {
      done();
      setEdit(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Plans &amp; Subscriptions
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage workspace subscription tiers, AI credit allowances, and webhook payment gateways.
        </p>
      </div>

      <Err e={plans.error} />

      {/* Plans Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Plans</h2>
          <span className="text-xs text-slate-500">Live limits apply dynamically across workspaces</span>
        </div>

        <Table head={['Plan Details', 'Price / Month', 'AI Credits', 'Max Accounts', 'Subscriptions', 'Status', 'Actions']}>
          {plans.data?.map((p) => {
            const isEditing = edit?.id === p.id;
            return (
              <tr key={p.id}>
                {isEditing ? (
                  <>
                    <Td>
                      <Input
                        value={edit.name}
                        onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                        className="h-8 text-xs font-semibold"
                      />
                      <div className="mt-1 font-mono text-[10px] text-slate-400">{p.code}</div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">$</span>
                        <Input
                          type="number"
                          value={edit.priceCents / 100}
                          onChange={(e) => setEdit({ ...edit, priceCents: Math.round(num(e.target.value) * 100) })}
                          className="h-8 w-24 text-xs"
                        />
                      </div>
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        value={edit.aiCreditsPerMonth}
                        onChange={(e) => setEdit({ ...edit, aiCreditsPerMonth: num(e.target.value) })}
                        className="h-8 w-24 text-xs"
                      />
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        value={edit.maxAccounts}
                        onChange={(e) => setEdit({ ...edit, maxAccounts: num(e.target.value) })}
                        className="h-8 w-20 text-xs"
                      />
                    </Td>
                    <Td>{p.subscriptions}</Td>
                    <Td>
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={edit.active}
                          disabled={p.code === 'free'}
                          onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Active</span>
                      </label>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="brand"
                          disabled={update.isPending}
                          onClick={() => update.mutate(edit)}
                          className="h-7 text-xs"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEdit(null)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </Td>
                  </>
                ) : (
                  <>
                    <Td>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.code}</div>
                    </Td>
                    <Td>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        ${(p.priceCents / 100).toFixed(2)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        <span>{p.aiCreditsPerMonth.toLocaleString()}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <span>{p.maxAccounts}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="font-semibold">{p.subscriptions}</span>
                    </Td>
                    <Td>
                      <Badge value={p.active ? 'ACTIVE' : 'CANCELLED'} />
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEdit(p)}
                        className="h-7 text-xs"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                    </Td>
                  </>
                )}
              </tr>
            );
          })}
        </Table>
      </div>

      {/* Create Plan Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Create New Plan</CardTitle>
            <CardDescription>
              Configure a new billing tier with customized quotas for channels and AI generation.
            </CardDescription>
          </div>
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40">
            <Plus className="h-4 w-4" />
          </div>
        </CardHeader>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-2">
          <div>
            <Label>Plan Code</Label>
            <Input
              placeholder="e.g. enterprise"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
            />
          </div>
          <div>
            <Label>Display Name</Label>
            <Input
              placeholder="e.g. Enterprise Plus"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Monthly Price (cents)</Label>
            <Input
              type="number"
              placeholder="4900 = $49.00"
              value={form.priceCents}
              onChange={(e) => setForm({ ...form, priceCents: num(e.target.value) })}
            />
          </div>
          <div>
            <Label>AI Credits / Month</Label>
            <Input
              type="number"
              value={form.aiCreditsPerMonth}
              onChange={(e) => setForm({ ...form, aiCreditsPerMonth: num(e.target.value) })}
            />
          </div>
          <div>
            <Label>Max Channels</Label>
            <Input
              type="number"
              value={form.maxAccounts}
              onChange={(e) => setForm({ ...form, maxAccounts: num(e.target.value) })}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Limits take effect immediately for newly assigned workspaces.
          </p>
          <Button
            variant="brand"
            disabled={create.isPending || !form.code || !form.name}
            onClick={() => create.mutate()}
          >
            Create Plan
          </Button>
        </div>
      </Card>

      {/* Subscriptions & Webhooks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Subscription Ledger
          </h2>
          <span className="text-xs text-slate-500">Audited via verified webhooks</span>
        </div>

        {subs.data && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40">
                  <Webhook className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Payment Gateway Webhook Status
                  </div>
                  <div className="text-xs text-slate-500">
                    Provider: {subs.data.webhooks.provider ?? 'None configured'} · Events recorded:{' '}
                    {subs.data.webhooks.eventsRecorded}
                  </div>
                </div>
              </div>
              <Badge value={subs.data.webhooks.configured ? 'ACTIVE' : 'PENDING'} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{subs.data.webhooks.note}</p>
          </div>
        )}

        {subs.data?.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
            No paid customer subscriptions active. All existing workspaces are currently provisioned on the Free tier.
          </div>
        ) : (
          <>
            <Table head={['Workspace', 'Active Tier', 'Billing State', 'Current Period End']}>
              {subs.data?.items.map((s) => (
                <tr key={s.id}>
                  <Td className="font-semibold text-slate-900 dark:text-slate-100">
                    {s.workspace.name}
                  </Td>
                  <Td>
                    <span className="font-semibold text-blue-600">{s.plan.name}</span>
                  </Td>
                  <Td>
                    <Badge value={s.status} />
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
                  </Td>
                </tr>
              ))}
            </Table>

            {subs.data && (
              <Pager
                page={subs.data.page}
                pageSize={subs.data.pageSize}
                total={subs.data.total}
                set={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
