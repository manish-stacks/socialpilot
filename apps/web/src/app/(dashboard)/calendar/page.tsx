'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { Account, PostItem, wsPath } from '@/lib/types';
import { dayKey } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';

export default function CalendarPage() {
  const { workspace } = useApp();
  const tz = workspace?.timezone ?? 'UTC';
  const id = workspace?.id;

  const [cursor, setCursor] = useState(() => {
    const k = dayKey(new Date(), tz);
    return { y: +k.slice(0, 4), m: +k.slice(5, 7) - 1 };
  });

  const [platform, setPlatform] = useState('');
  const [account, setAccount] = useState('');

  const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const days = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const from = new Date(Date.UTC(cursor.y, cursor.m, 1) - 86_400_000).toISOString();
  const to = new Date(Date.UTC(cursor.y, cursor.m + 1, 2)).toISOString();

  const accounts = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => api<Account[]>(wsPath(id!, '/accounts')),
    enabled: !!id,
  });

  const posts = useQuery({
    queryKey: ['posts', id, 'cal', from, platform],
    enabled: !!id,
    queryFn: () =>
      api<{ items: PostItem[] }>(
        wsPath(
          id!,
          `/posts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=200${
            platform ? `&platform=${platform}` : ''
          }`
        )
      ),
  });

  const byDay = useMemo(() => {
    const m: Record<string, PostItem[]> = {};
    for (const p of posts.data?.items ?? []) {
      if (!p.scheduledAt || (account && !p.targets.some((t) => t.socialAccount.id === account)))
        continue;
      (m[dayKey(p.scheduledAt, tz)] ??= []).push(p);
    }
    return m;
  }, [posts.data, account, tz]);

  if (!workspace) return null;

  const shift = (d: number) =>
    setCursor(({ y, m }) => {
      const n = new Date(Date.UTC(y, m + d, 1));
      return { y: n.getUTCFullYear(), m: n.getUTCMonth() };
    });

  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const today = dayKey(new Date(), tz);
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {first.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Times calculated in {tz}. Click any day box to draft a post scheduled for that date.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-36 text-xs"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="">All Channels</option>
            {['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X', 'MOCK'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>

          <Select
            className="w-40 text-xs"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="">All Profiles</option>
            {accounts.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => shift(-1)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => shift(1)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" asChild className="h-8 text-xs">
            <Link href="/posts">
              <List className="h-3.5 w-3.5" />
              <span>List View</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200 shadow-sm dark:border-slate-800/80 dark:bg-slate-800">
        <div className="grid grid-cols-7 gap-px">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div
              key={d}
              className="bg-slate-50 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400"
            >
              {d}
            </div>
          ))}
          {cells.map((n, i) => {
            const inMonth = n >= 1 && n <= days;
            const key = `${cursor.y}-${pad(cursor.m + 1)}-${pad(n)}`;
            const list = inMonth ? byDay[key] ?? [] : [];
            const isToday = key === today;

            return (
              <div
                key={i}
                className={cn(
                  'min-h-[115px] bg-white p-2 text-xs transition-colors dark:bg-slate-950',
                  !inMonth && 'bg-slate-50/50 opacity-40 dark:bg-slate-900/40'
                )}
              >
                {inMonth && (
                  <>
                    <div className="flex items-center justify-between mb-1.5">
                      <Link
                        href={`/posts/new?date=${key}`}
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition',
                          isToday
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        )}
                      >
                        {n}
                      </Link>
                      {list.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">{list.length}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {list.slice(0, 3).map((p) => (
                        <Link
                          key={p.id}
                          href={`/posts/${p.id}`}
                          className="group block truncate rounded-md border border-slate-100 bg-slate-50 px-1.5 py-1 text-[11px] font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                          title={p.caption}
                        >
                          <span className="line-clamp-1">{p.caption || '(No caption)'}</span>
                        </Link>
                      ))}
                      {list.length > 3 && (
                        <div className="text-[10px] text-blue-600 font-semibold px-1">
                          +{list.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
