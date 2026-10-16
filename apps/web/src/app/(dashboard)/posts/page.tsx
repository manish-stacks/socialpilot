'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { PostItem, wsPath } from '@/lib/types';
import { fmt } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/card';

const TABS = ['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED', 'CANCELLED'];

export default function Posts() {
  const { workspace } = useApp();
  const [status, setStatus] = useState('ALL'), [q, setQ] = useState(''), [page, setPage] = useState(1);
  const id = workspace?.id, pageSize = 15;
  const res = useQuery({
    queryKey: ['posts', id, status, q, page],
    queryFn: () => api<{ items: PostItem[]; total: number }>(wsPath(id!, `/posts?status=${status}&page=${page}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ''}`)),
    enabled: !!id,
  });
  if (!workspace) return null;
  const pages = Math.max(1, Math.ceil((res.data?.total ?? 0) / pageSize));
  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Posts</h1>
        {workspace.role !== 'VIEWER' && <Button asChild><Link href="/posts/new">New post</Link></Button>}</div>
      <div className="flex flex-wrap gap-1">{TABS.map((t) => (
        <button key={t} onClick={() => { setStatus(t); setPage(1); }} className={cn('rounded-full px-3 py-1 text-xs', status === t ? 'bg-indigo-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800')}>{t.replace(/_/g, ' ').toLowerCase()}</button>))}</div>
      <Input placeholder="Search captions…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {res.error && <p className="text-sm text-red-600">{(res.error as Error).message}</p>}
      {res.data?.items.length === 0 && <Empty>No posts match.</Empty>}
      <ul className="space-y-2">{res.data?.items.map((p) => (
        <li key={p.id}><Link href={`/posts/${p.id}`} className="block rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
          <div className="flex items-center justify-between gap-3"><span className="line-clamp-1 text-sm font-medium">{p.caption || '(no caption)'}</span><Badge value={p.status} /></div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            {p.scheduledAt ? fmt(p.scheduledAt, workspace.timezone) : 'Not scheduled'}
            {p.targets.map((t) => <span key={t.id} className="flex items-center gap-1">{t.socialAccount.platform}<Badge value={t.status} className="scale-90" /></span>)}
            {p.targets.some((t) => t.errorMessage) && <span className="text-red-600">{p.targets.find((t) => t.errorMessage)?.errorMessage}</span>}</div>
        </Link></li>))}</ul>
      <div className="flex items-center justify-between text-sm text-neutral-500"><span>{res.data?.total ?? 0} posts</span>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>{page} / {pages}
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    </div>
  );
}
