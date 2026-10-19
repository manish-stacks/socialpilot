'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Calendar, Clock, FileText, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { PostItem, wsPath } from '@/lib/types';
import { fmt } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/card';

const TABS = [
  'ALL',
  'DRAFT',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'PARTIALLY_PUBLISHED',
  'FAILED',
  'CANCELLED',
];

export default function PostsPage() {
  const { workspace } = useApp();
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const id = workspace?.id;
  const pageSize = 15;

  const res = useQuery({
    queryKey: ['posts', id, status, q, page],
    queryFn: () =>
      api<{ items: PostItem[]; total: number }>(
        wsPath(
          id!,
          `/posts?status=${status}&page=${page}&pageSize=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ''}`
        )
      ),
    enabled: !!id,
  });

  if (!workspace) return null;
  const pages = Math.max(1, Math.ceil((res.data?.total ?? 0) / pageSize));

  return (
    <div className=" space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Posts &amp; Social Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage drafts, review scheduled posts, and monitor cross-platform delivery.
          </p>
        </div>
        {workspace.role !== 'VIEWER' && (
          <Button asChild variant="brand" className="shadow-xs">
            <Link href="/posts/new">
              <Plus className="h-4 w-4" />
              <span>Create Post</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setStatus(t);
              setPage(1);
            }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150',
              status === t
                ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-800 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {t.replace(/_/g, ' ').toLowerCase()}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-10"
          placeholder="Search by post caption or hashtags…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {res.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {(res.error as Error).message}
        </div>
      )}

      {res.data?.items.length === 0 && (
        <Empty
          icon={<FileText className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
          className="py-12"
        >
          <p className="font-medium text-slate-700 dark:text-slate-300">No posts found</p>
          <p className="mt-1 text-xs text-slate-400">
            {status !== 'ALL' ? `No posts match status "${status.toLowerCase()}".` : 'Create your first post to start publishing.'}
          </p>
        </Empty>
      )}

      {/* Posts List */}
      <div className="space-y-3">
        {res.data?.items.map((p) => (
          <Link
            key={p.id}
            href={`/posts/${p.id}`}
            className="group block rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-blue-500/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                  {p.caption || '(Draft without caption)'}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{p.scheduledAt ? fmt(p.scheduledAt, workspace.timezone) : 'Unscheduled Draft'}</span>
                  </div>
                  {p.targets.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium border border-slate-200/60 dark:bg-slate-850 dark:border-slate-800"
                    >
                      <span>{t.socialAccount.platform}</span>
                      <Badge value={t.status} className="scale-90" />
                    </span>
                  ))}
                  {p.targets.some((t) => t.errorMessage) && (
                    <span className="text-rose-600 font-medium">
                      {p.targets.find((t) => t.errorMessage)?.errorMessage}
                    </span>
                  )}
                </div>
              </div>
              <Badge value={p.status} />
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {res.data && res.data.total > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
          <span>{res.data.total} total posts</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="font-medium">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
