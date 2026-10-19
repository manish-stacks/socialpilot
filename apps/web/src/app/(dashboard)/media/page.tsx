'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  FileVideo,
  Grid,
  Image as ImageIcon,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { MediaItem, wsPath } from '@/lib/types';
import { fmt } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form';
import { Card, Empty } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime';

const put = (url: string, file: File, onProgress: (n: number) => void) =>
  new Promise<void>((res, rej) => {
    const x = new XMLHttpRequest();
    x.open('PUT', url);
    x.setRequestHeader('Content-Type', file.type);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => (x.status < 300 ? res() : rej(new Error(`Storage rejected the upload (${x.status})`)));
    x.onerror = () => rej(new Error('Upload failed (network or bucket CORS configuration)'));
    x.send(file);
  });

export default function MediaPage() {
  const { workspace } = useApp();
  const id = workspace?.id;
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [progress, setProgress] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ['media', id, q, type],
    queryFn: () =>
      api<MediaItem[]>(
        wsPath(id!, `/media?type=${type}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      ),
    enabled: !!id,
    retry: false,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      setProgress(0);
      const { id: aid, uploadUrl } = await api<{ id: string; uploadUrl: string }>(
        wsPath(id!, '/media/upload-url'),
        {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }),
        }
      );
      await put(uploadUrl, file, setProgress);
      await api(wsPath(id!, `/media/${aid}/confirm`), { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Media file stored successfully');
      qc.invalidateQueries({ queryKey: ['media', id] });
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setProgress(null),
  });

  const del = useMutation({
    mutationFn: (m: string) => api(wsPath(id!, `/media/${m}`), { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Asset deleted');
      qc.invalidateQueries({ queryKey: ['media', id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!workspace) return null;
  const canEdit = workspace.role !== 'VIEWER';
  const kb = (n: number) =>
    n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Media Asset Library
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Secure cloud storage for post creatives, promotional reels, and brand imagery.
          </p>
        </div>
        {canEdit && (
          <div>
            <input
              ref={ref}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                e.target.value = '';
              }}
            />
            <Button
              variant="brand"
              disabled={upload.isPending}
              onClick={() => ref.current?.click()}
            >
              <Upload className="h-4 w-4" />
              <span>{progress !== null ? `Uploading ${progress}%` : 'Upload Asset'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Filter and View Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10 text-xs"
            placeholder="Search assets by file name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="w-32 text-xs"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All Formats</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </Select>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setView('grid')}
              className={`rounded-md p-1.5 transition ${
                view === 'grid'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded-md p-1.5 transition ${
                view === 'list'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {list.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          Storage service unavailable: {(list.error as Error).message}
        </div>
      )}

      {list.data?.length === 0 && (
        <Empty
          icon={<ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
          className="py-16"
        >
          <p className="font-semibold text-slate-800 dark:text-slate-200">No media uploaded</p>
          <p className="mt-1 text-xs text-slate-400">
            Upload images (up to 10 MB) or videos (up to 500 MB) to attach to scheduled posts.
          </p>
        </Empty>
      )}

      {/* Grid or List View */}
      {view === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {list.data?.map((m) => (
            <Card key={m.id} className="group overflow-hidden p-2.5 flex flex-col justify-between">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {m.mimeType.startsWith('image/') ? (
                  <img
                    src={m.url}
                    alt={m.filename}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  />
                ) : (
                  <video
                    src={m.url}
                    controls
                    preload="metadata"
                    className="h-full w-full bg-black object-cover"
                  />
                )}
              </div>
              <div className="mt-2.5">
                <div className="truncate font-semibold text-xs text-slate-900 dark:text-slate-100" title={m.filename}>
                  {m.filename}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{kb(m.sizeBytes)}</span>
                  {canEdit && (
                    <Confirm
                      trigger="Delete"
                      title="Delete asset?"
                      body="Permanently removes file from media bucket. Blocked if active posts use it."
                      action="Delete"
                      onConfirm={() => del.mutate(m.id)}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {list.data?.map((m) => (
            <Card key={m.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  {m.mimeType.startsWith('image/') ? (
                    <img src={m.url} alt={m.filename} className="h-full w-full object-cover" />
                  ) : (
                    <video src={m.url} className="h-full w-full bg-black object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {m.filename}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {kb(m.sizeBytes)} · {fmt(m.createdAt, workspace.timezone)}
                  </div>
                </div>
              </div>
              {canEdit && (
                <Confirm
                  trigger="Delete"
                  title="Delete asset?"
                  body="Permanently removes file from media storage."
                  action="Delete"
                  onConfirm={() => del.mutate(m.id)}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
