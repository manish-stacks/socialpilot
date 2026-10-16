'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Composer } from '@/components/composer';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { PostItem, wsPath } from '@/lib/types';

export default function EditPost() {
  const { id } = useParams<{ id: string }>();
  const { workspace } = useApp();
  const q = useQuery({ queryKey: ['post', workspace?.id, id], queryFn: () => api<PostItem>(wsPath(workspace!.id, `/posts/${id}`)), enabled: !!workspace,
    refetchInterval: (q) => { const p = q.state.data; return p && (p.status === 'PUBLISHING' || p.targets.some((t) => ['QUEUED', 'PUBLISHING', 'PROCESSING'].includes(t.status))) ? 4000 : false; } });
  if (q.error) return <p className="text-sm text-red-600">{(q.error as Error).message}</p>;
  if (!q.data) return <p className="text-sm text-neutral-500">Loading…</p>;
  return <Composer key={q.data.updatedAt ?? q.data.status + q.data.scheduledAt} post={q.data} />;
}
