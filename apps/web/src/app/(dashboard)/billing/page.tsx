'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  CreditCard,
  Info,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  aiCreditsPerMonth: number;
  maxAccounts: number;
}

interface Billing {
  plan: Plan;
  status: string;
  billingProviderConfigured: boolean;
  usage: { aiUsed: number; aiLimit: number; accountsUsed: number; accountsLimit: number };
}

export default function BillingPage() {
  const { workspace } = useApp();
  const id = workspace?.id;

  const plans = useQuery({
    queryKey: ['plans', id],
    queryFn: () => api<Plan[]>(wsPath(id!, '/billing/plans')),
    enabled: !!id,
  });

  const b = useQuery({
    queryKey: ['billing', id],
    queryFn: () => api<Billing>(wsPath(id!, '/billing')),
    enabled: !!id,
  });

  if (!workspace || !b.data) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mr-2" />
        <span>Loading subscription details…</span>
      </div>
    );
  }

  const { usage } = b.data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Billing &amp; Subscription Plan
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Review your workspace allowances, quota consumption, and available tier upgrades.
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <Card className="border-blue-500/20 bg-gradient-to-r from-blue-50/50 via-white to-purple-50/30 dark:from-slate-900 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Active Workspace Tier
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {b.data.plan.name} Tier
              </span>
              <Badge value={b.data.status} />
            </div>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {b.data.plan.priceCents === 0 ? 'Free' : `$${b.data.plan.priceCents / 100}`}
            </span>
            <span className="text-xs text-slate-500">{b.data.plan.priceCents > 0 ? '/month' : ''}</span>
          </div>
        </div>

        {/* Quota consumption bars */}
        <div className="grid gap-4 sm:grid-cols-2 pt-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>AI Studio Generations</span>
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {usage.aiUsed} / {usage.aiLimit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-600"
                style={{ width: `${Math.min(100, (usage.aiUsed / usage.aiLimit) * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Connected Social Accounts</span>
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {usage.accountsUsed} / {usage.accountsLimit}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.min(100, (usage.accountsUsed / usage.accountsLimit) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {!b.data.billingProviderConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <span>
            Payment gateways are not active in this development environment. Quota limits are strictly enforced, but simulated plan changes can be adjusted by your administrator.
          </span>
        </div>
      )}

      {/* Available Tier Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Available Subscription Plans
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.data?.map((p) => {
            const isCurrent = p.code === b.data.plan.code;
            return (
              <Card
                key={p.id}
                className={cn(
                  'relative flex flex-col justify-between transition-all duration-200',
                  isCurrent
                    ? 'border-2 border-blue-600 shadow-md dark:border-blue-500'
                    : 'hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                    Current Plan
                  </span>
                )}

                <div>
                  <CardTitle className="text-base font-bold">{p.name}</CardTitle>
                  <div className="mt-3 flex items-baseline">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                      {p.priceCents === 0 ? '$0' : `$${p.priceCents / 100}`}
                    </span>
                    <span className="ml-1 text-xs text-slate-500 font-medium">/month</span>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>
                        <b>{p.aiCreditsPerMonth.toLocaleString()}</b> AI generations
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>
                        <b>{p.maxAccounts}</b> Social channels
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Automated dispatcher</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Media cloud storage</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant={isCurrent ? 'brand' : 'outline'}
                    size="sm"
                    className="w-full text-xs font-semibold"
                    disabled={isCurrent || !b.data.billingProviderConfigured}
                  >
                    {isCurrent ? 'Active Plan' : 'Select Plan'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
