'use client';
import {
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Link2,
  Plug,
  Server,
  Share2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Err, useAdmin } from '@/components/admin/kit';

interface I {
  providers: {
    platform: string;
    implemented: boolean;
    configured: boolean;
    env: { name: string; set: boolean }[];
    note: string;
    accounts: { status: string; count: number }[];
    last24h: { ok: number; bad: number };
  }[];
  services: { name: string; ok?: boolean; configured?: boolean; detail?: string | null }[];
}

export default function IntegrationsPage() {
  const q = useAdmin<I>('/integrations', true, 30000);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Platform &amp; Infrastructure Integrations
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          System connectivity across social media APIs, object storage, background workers, and AI services.
        </p>
      </div>

      <Err e={q.error} />

      {q.data && (
        <>
          {/* Core Services Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Core Backend Infrastructure Services
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {q.data.services.map((s) => {
                const good = s.ok ?? s.configured;
                return (
                  <div
                    key={s.name}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {s.name}
                      </div>
                      <Badge value={good ? 'ACTIVE' : s.ok === false ? 'ERROR' : 'PENDING'} />
                    </div>
                    {s.detail && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                        {s.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Social Platform Providers Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Social Media Graph API Channels
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {q.data.providers.map((p) => {
                const isReady = p.implemented && p.configured;
                return (
                  <Card key={p.platform} className="flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold dark:bg-blue-950/40">
                            <Share2 className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{p.platform}</CardTitle>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {p.implemented ? 'Implemented' : 'Planned'}
                            </span>
                          </div>
                        </div>
                        <Badge
                          value={!p.implemented ? 'CANCELLED' : p.configured ? 'ACTIVE' : 'PENDING'}
                        />
                      </div>

                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {p.note}
                      </p>

                      {p.env.length > 0 && (
                        <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-850">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Environment Flags
                          </div>
                          <ul className="space-y-1 text-xs">
                            {p.env.map((e) => (
                              <li key={e.name} className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                                  {e.name}
                                </span>
                                {e.set ? (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                    <CheckCircle2 className="h-3 w-3" /> Set
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                                    <XCircle className="h-3 w-3" /> Missing
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 flex items-center justify-between">
                      <span>
                        Accounts:{' '}
                        <b>
                          {p.accounts.length
                            ? p.accounts.map((a) => `${a.status.toLowerCase()} (${a.count})`).join(', ')
                            : 'none'}
                        </b>
                      </span>
                      <span className="text-[11px]">
                        24h: <span className="text-emerald-600 font-bold">{p.last24h.ok}</span> /{' '}
                        <span className="text-rose-500 font-bold">{p.last24h.bad}</span>
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
