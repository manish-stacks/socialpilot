'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { MediaItem, wsPath } from '@/lib/types';
import { fmt } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { Card, Empty } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';
const put = (url: string, file: File, onProgress: (n: number) => void) => new Promise<void>((res, rej) => {
  const x = new XMLHttpRequest();
  x.open('PUT', url); x.setRequestHeader('Content-Type', file.type);
  x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
  x.onload = () => (x.status < 300 ? res() : rej(new Error(`Storage rejected the upload (${x.status})`)));
  x.onerror = () => rej(new Error('Upload failed (network or bucket CORS configuration)'));
  x.send(file);
});

export default function Media() {
  const { workspace } = useApp();
  const id = workspace?.id, qc = useQueryClient(), ref = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(''), [type, setType] = useState(''), [view, setView] = useState<'grid' | 'list'>('grid'), [progress, setProgress] = useState<number | null>(null);
  const list = useQuery({ queryKey: ['media', id, q, type], queryFn: () => api<MediaItem[]>(wsPath(id!, `/media?type=${type}${q ? `&q=${encodeURIComponent(q)}` : ''}`)), enabled: !!id, retry: false });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      setProgress(0);
      const { id: aid, uploadUrl } = await api<{ id: string; uploadUrl: string }>(wsPath(id!, '/media/upload-url'), { method: 'POST', body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }) });
      await put(uploadUrl, file, setProgress);
      await api(wsPath(id!, `/media/${aid}/confirm`), { method: 'POST' });
    },
    onSuccess: () => { toast.success('Uploaded'); qc.invalidateQueries({ queryKey: ['media', id] }); },
    onError: (e) => toast.error((e as Error).message), onSettled: () => setProgress(null),
  });
  const del = useMutation({ mutationFn: (m: string) => api(wsPath(id!, `/media/${m}`), { method: 'DELETE' }), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['media', id] }); }, onError: (e) => toast.error((e as Error).message) });
  if (!workspace) return null;
  const canEdit = workspace.role !== 'VIEWER';
  const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);
  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Media library</h1>
        {canEdit && <><input ref={ref} type="file" accept={ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
          <Button disabled={upload.isPending} onClick={() => ref.current?.click()}>{progress !== null ? `Uploading ${progress}%` : 'Upload file'}</Button></>}</div>
      <p className="text-xs text-neutral-500">Images up to 10 MB (JPEG, PNG, WebP, GIF); video up to 500 MB (MP4, MOV). Each platform applies its own additional limits.</p>
      <div className="flex gap-2"><Input placeholder="Search filenames…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="w-32" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option><option value="image">Images</option><option value="video">Videos</option></Select>
        <Select className="w-28" value={view} onChange={(e) => setView(e.target.value as 'grid')}><option value="grid">Grid</option><option value="list">List</option></Select></div>
      {list.error && <Card className="text-sm text-neutral-600">Media storage unavailable: {(list.error as Error).message}</Card>}
      {list.data?.length === 0 && <Empty>No media yet.</Empty>}
      <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 md:grid-cols-4' : 'space-y-2'}>{list.data?.map((m) => (
        <Card key={m.id} className={view === 'grid' ? 'p-2' : 'flex items-center gap-3 p-2'}>
          {m.mimeType.startsWith('image/') ? <img src={m.url} alt={m.filename} className={view === 'grid' ? 'aspect-square w-full rounded object-cover' : 'h-12 w-12 rounded object-cover'} />
            : <video src={m.url} controls preload="metadata" className={view === 'grid' ? 'aspect-square w-full rounded bg-black object-cover' : 'h-12 w-20 rounded bg-black'} />}
          <div className="mt-2 flex-1 text-xs"><div className="truncate font-medium" title={m.filename}>{m.filename}</div><div className="text-neutral-500">{kb(m.sizeBytes)} · {fmt(m.createdAt, workspace.timezone)}</div></div>
          {canEdit && <div className={view === 'grid' ? 'mt-2' : ''}><Confirm trigger="Delete" title="Delete this file?" body="It's removed from storage. Deletion is blocked if posts use it." action="Delete" onConfirm={() => del.mutate(m.id)} /></div>}
        </Card>))}</div>
    </div>
  );
}
