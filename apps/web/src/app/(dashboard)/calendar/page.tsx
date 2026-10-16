'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { Account, PostItem, wsPath } from '@/lib/types';
import { dayKey } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';

export default function Calendar() {
  const { workspace } = useApp();
  const tz = workspace?.timezone ?? 'UTC', id = workspace?.id;
  const [cursor, setCursor] = useState(() => { const k = dayKey(new Date(), tz); return { y: +k.slice(0, 4), m: +k.slice(5, 7) - 1 }; });
  const [platform, setPlatform] = useState(''), [account, setAccount] = useState('');
  const first = new Date(Date.UTC(cursor.y, cursor.m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const days = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const from = new Date(Date.UTC(cursor.y, cursor.m, 1) - 86_400_000).toISOString(), to = new Date(Date.UTC(cursor.y, cursor.m + 1, 2)).toISOString();
  const accounts = useQuery({ queryKey: ['accounts', id], queryFn: () => api<Account[]>(wsPath(id!, '/accounts')), enabled: !!id });
  const posts = useQuery({ queryKey: ['posts', id, 'cal', from, platform], enabled: !!id,
    queryFn: () => api<{ items: PostItem[] }>(wsPath(id!, `/posts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=200${platform ? `&platform=${platform}` : ''}`)) });
  const byDay = useMemo(() => {
    const m: Record<string, PostItem[]> = {};
    for (const p of posts.data?.items ?? []) {
      if (!p.scheduledAt || (account && !p.targets.some((t) => t.socialAccount.id === account))) continue;
      (m[dayKey(p.scheduledAt, tz)] ??= []).push(p);
    }
    return m;
  }, [posts.data, account, tz]);
  if (!workspace) return null;
  const shift = (d: number) => setCursor(({ y, m }) => { const n = new Date(Date.UTC(y, m + d, 1)); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const today = dayKey(new Date(), tz);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{first.toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-36" value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">All platforms</option>{['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X', 'MOCK'].map((p) => <option key={p}>{p}</option>)}</Select>
          <Select className="w-44" value={account} onChange={(e) => setAccount(e.target.value)}><option value="">All accounts</option>{accounts.data?.map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}</Select>
          <Button variant="outline" size="sm" onClick={() => shift(-1)}>←</Button><Button variant="outline" size="sm" onClick={() => shift(1)}>→</Button>
          <Button variant="outline" size="sm" asChild><Link href="/posts">List view</Link></Button>
        </div>
      </div>
      <p className="text-xs text-neutral-500">Times shown in {tz}. Click an empty day to start a post for it.</p>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="bg-neutral-50 p-2 text-center text-xs font-medium dark:bg-neutral-900">{d}</div>)}
        {cells.map((n, i) => {
          const inMonth = n >= 1 && n <= days, key = `${cursor.y}-${pad(cursor.m + 1)}-${pad(n)}`, list = inMonth ? byDay[key] ?? [] : [];
          return (
            <div key={i} className={cn('min-h-[104px] bg-white p-1.5 text-xs dark:bg-neutral-950', !inMonth && 'opacity-30')}>
              {inMonth && (<>
                <Link href={`/posts/new?date=${key}`} className={cn('mb-1 inline-block rounded px-1 hover:bg-neutral-100 dark:hover:bg-neutral-800', key === today && 'bg-indigo-600 text-white hover:bg-indigo-700')}>{n}</Link>
                <div className="space-y-1">{list.slice(0, 3).map((p) => (
                  <Link key={p.id} href={`/posts/${p.id}`} className="block truncate rounded bg-neutral-100 px-1 py-0.5 hover:bg-neutral-200 dark:bg-neutral-800" title={p.caption}>
                    <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', p.status === 'SCHEDULED' ? 'bg-blue-500' : p.status === 'DRAFT' ? 'bg-neutral-400' : p.status === 'FAILED' ? 'bg-red-500' : 'bg-green-500')} />{p.caption || '(no caption)'}</Link>))}
                  {list.length > 3 && <div className="text-neutral-500">+{list.length - 3} more</div>}</div></>)}
            </div>);
        })}
      </div>
      {posts.error && <p className="text-sm text-red-600">{(posts.error as Error).message}</p>}
      <div className="flex gap-3 text-xs text-neutral-500"><span><Badge value="SCHEDULED" /> scheduled</span><span><Badge value="DRAFT" /> draft</span><span><Badge value="FAILED" /> failed</span></div>
    </div>
  );
}
