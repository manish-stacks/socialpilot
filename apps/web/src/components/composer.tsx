'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { Account, Attempt, MediaItem, PostItem, wsPath } from '@/lib/types';
import { fmt, fromInput, toInput } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';

export interface Prefill { caption?: string; hashtags?: string; cta?: string; when?: string }
const parseTags = (s: string) => s.split(/[\s,]+/).map((t) => t.replace(/^#/, '')).filter(Boolean);
const compose = (c: string, tags: string[], cta: string) => [c.trim(), cta.trim(), tags.map((t) => '#' + t).join(' ')].filter(Boolean).join('\n\n');

export function Composer({ post, prefill }: { post?: PostItem; prefill?: Prefill }) {
  const { workspace } = useApp();
  const router = useRouter(), qc = useQueryClient();
  const id = workspace!.id, tz = workspace!.timezone;
  const [caption, setCaption] = useState(post?.caption ?? prefill?.caption ?? '');
  const [tagsText, setTags] = useState(post ? post.hashtags.join(' ') : prefill?.hashtags ?? '');
  const [cta, setCta] = useState(post?.cta ?? prefill?.cta ?? '');
  const [targets, setTargets] = useState<Record<string, string>>(Object.fromEntries((post?.targets ?? []).map((t) => [t.socialAccount.id, t.captionOverride ?? ''])));
  const [mediaIds, setMediaIds] = useState<string[]>(post?.media.map((m) => m.mediaAsset.id) ?? []);
  const [when, setWhen] = useState(post?.scheduledAt ? toInput(post.scheduledAt, tz) : prefill?.when ?? '');
  const [errors, setErrors] = useState<string[]>([]);

  const status = post?.status ?? 'DRAFT';
  const editable = ['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(status) && workspace!.role !== 'VIEWER';
  const accounts = useQuery({ queryKey: ['accounts', id], queryFn: () => api<Account[]>(wsPath(id, '/accounts')) });
  const media = useQuery({ queryKey: ['media', id, '', ''], queryFn: () => api<MediaItem[]>(wsPath(id, '/media')), retry: false });
  const tags = parseTags(tagsText);
  const body = () => ({ caption, hashtags: tags, cta: cta || undefined, mediaIds,
    targets: Object.entries(targets).map(([accountId, o]) => ({ accountId, ...(o.trim() ? { captionOverride: o } : {}) })) });
  const fail = (e: unknown) => { const m = (e as Error).message; setErrors(m.split(', ')); toast.error('Could not save'); };
  const done = (p: PostItem, msg: string) => { setErrors([]); qc.invalidateQueries({ queryKey: ['posts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success(msg); if (!post) router.replace(`/posts/${p.id}`); else qc.setQueryData(['post', id, p.id], p); };

  const save = useMutation({
    mutationFn: () => post ? api<PostItem>(wsPath(id, `/posts/${post.id}`), { method: 'PATCH', body: JSON.stringify(body()) }) : api<PostItem>(wsPath(id, '/posts'), { method: 'POST', body: JSON.stringify(body()) }),
    onSuccess: (p) => done(p, 'Saved'), onError: fail,
  });
  const schedule = useMutation({
    mutationFn: async () => {
      const saved = await (post ? api<PostItem>(wsPath(id, `/posts/${post.id}`), { method: 'PATCH', body: JSON.stringify(body()) }) : api<PostItem>(wsPath(id, '/posts'), { method: 'POST', body: JSON.stringify(body()) }));
      return api<PostItem>(wsPath(id, `/posts/${saved.id}/schedule`), { method: 'POST', body: JSON.stringify({ scheduledAt: fromInput(when, tz).toISOString() }) });
    },
    onSuccess: (p) => done(p, status === 'SCHEDULED' ? 'Rescheduled' : 'Scheduled'), onError: fail,
  });
  const cancel = useMutation({ mutationFn: () => api<PostItem>(wsPath(id, `/posts/${post!.id}/cancel`), { method: 'POST' }), onSuccess: (p) => done(p, 'Cancelled'), onError: fail });
  const del = useMutation({ mutationFn: () => api(wsPath(id, `/posts/${post!.id}`), { method: 'DELETE' }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['posts'] }); router.replace('/posts'); }, onError: fail });
  const retry = useMutation({
    mutationFn: (v: { tid: string; confirm: boolean }) => api<PostItem>(wsPath(id, `/posts/${post!.id}/targets/${v.tid}/retry`), { method: 'POST', body: JSON.stringify({ confirmDuplicateRisk: v.confirm }) }),
    onSuccess: (p) => done(p, 'Retry queued'), onError: (e) => toast.error((e as Error).message),
  });
  const [openAttempts, setOpenAttempts] = useState<string | null>(null);
  const attempts = useQuery({ queryKey: ['attempts', openAttempts], enabled: !!openAttempts && !!post, queryFn: () => api<Attempt[]>(wsPath(id, `/posts/${post!.id}/targets/${openAttempts}/attempts`)) });
  const busy = save.isPending || schedule.isPending || cancel.isPending || del.isPending;

  const chosen = (accounts.data ?? []).filter((a) => a.id in targets);
  const toggle = (a: string) => setTargets((t) => { const n = { ...t }; if (a in n) delete n[a]; else n[a] = ''; return n; });
  const toggleMedia = (m: string) => setMediaIds((x) => (x.includes(m) ? x.filter((i) => i !== m) : [...x, m]));
  const picked = (media.data ?? []).filter((m) => mediaIds.includes(m.id));

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">{post ? 'Edit post' : 'New post'}</h1>{post && <Badge value={status} />}</div>
        {!editable && <p className="rounded-md border border-neutral-300 p-3 text-sm text-neutral-600">This post is {status.toLowerCase().replace('_', ' ')} and can't be edited{workspace!.role === 'VIEWER' ? ' (viewer role)' : ''}.</p>}
        {errors.length > 0 && <ul role="alert" className="list-disc rounded-md border border-red-300 bg-red-50 p-3 pl-7 text-sm text-red-800">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div><Label>Caption</Label><Textarea disabled={!editable} rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Hashtags (space or comma separated)</Label><Input disabled={!editable} value={tagsText} onChange={(e) => setTags(e.target.value)} /></div>
          <div><Label>Call to action</Label><Input disabled={!editable} value={cta} onChange={(e) => setCta(e.target.value)} /></div>
        </div>
        <div><Label>Accounts</Label>
          {accounts.data?.length === 0 ? <p className="text-sm text-neutral-500">No accounts connected. Connect one on the Accounts page to schedule posts.</p> :
            <div className="space-y-2">{accounts.data?.map((a) => {
              const on = a.id in targets, text = compose(targets[a.id] || caption, tags, cta), over = text.length > a.rules.maxCaption;
              return (<div key={a.id} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!editable} checked={on} onChange={() => toggle(a.id)} />
                  <span>{a.displayName}</span><span className="text-xs text-neutral-500">{a.platform}</span><Badge value={a.status} />
                  {on && <span className={cn('ml-auto text-xs', over ? 'font-semibold text-red-600' : 'text-neutral-500')}>{text.length}/{a.rules.maxCaption}</span>}</label>
                {on && a.rules.requiresMedia && mediaIds.length === 0 && <p className="mt-1 text-xs text-amber-700">{a.platform} requires an image or video.</p>}
                {on && <Textarea disabled={!editable} className="mt-2 min-h-[60px]" placeholder={`Override caption for ${a.platform} (optional)`} value={targets[a.id]} onChange={(e) => setTargets((t) => ({ ...t, [a.id]: e.target.value }))} />}
              </div>);
            })}</div>}
        </div>
        <div><Label>Media</Label>
          {media.error ? <p className="text-sm text-neutral-500">Media unavailable: {(media.error as Error).message}</p> :
            media.data?.length === 0 ? <p className="text-sm text-neutral-500">No media uploaded yet. Add files in the Media library.</p> :
            <div className="grid grid-cols-4 gap-2">{media.data?.map((m) => (
              <button type="button" key={m.id} disabled={!editable} onClick={() => toggleMedia(m.id)} className={cn('overflow-hidden rounded-md border-2', mediaIds.includes(m.id) ? 'border-indigo-600' : 'border-transparent')}>
                {m.mimeType.startsWith('image/') ? <img src={m.url} alt={m.filename} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center bg-neutral-200 p-1 text-[10px] dark:bg-neutral-800">{m.filename}</div>}
              </button>))}</div>}
        </div>
        <div><Label>Schedule for ({tz})</Label><Input disabled={!editable} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="max-w-xs" />
          <p className="mt-1 text-xs text-neutral-500">Scheduling is stored in UTC. Publishing itself starts working once the publishing worker (Phase 4) is built; until then scheduled posts stay scheduled.</p></div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy || !caption.trim()} onClick={() => save.mutate()}>Save {status === 'SCHEDULED' ? 'changes' : 'draft'}</Button>
            <Button disabled={busy || !caption.trim() || !when} onClick={() => schedule.mutate()}>{status === 'SCHEDULED' ? 'Reschedule' : 'Schedule'}</Button>
            {status === 'SCHEDULED' && <Confirm trigger="Cancel scheduled post" title="Cancel this post?" body="It won't be published. You can return it to draft later." action="Cancel post" onConfirm={() => cancel.mutate()} />}
            {post && (status === 'DRAFT' || status === 'CANCELLED') && <Confirm trigger="Delete" title="Delete this post?" body="This can't be undone." action="Delete" onConfirm={() => del.mutate()} />}
          </div>)}
        {post && post.status !== 'DRAFT' && (
          <Card><CardTitle>Publishing status per account</CardTitle>
            <ul className="mt-3 space-y-3 text-sm">{post.targets.map((t) => (
              <li key={t.id} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex flex-wrap items-center gap-2"><Badge value={t.status} /><span className="font-medium">{t.socialAccount.displayName}</span><span className="text-xs text-neutral-500">{t.socialAccount.platform}</span>
                  {t.attempts > 0 && <span className="text-xs text-neutral-500">· {t.attempts} attempt{t.attempts > 1 ? 's' : ''}</span>}
                  {t.status === 'QUEUED' && t.nextAttemptAt && <span className="text-xs text-neutral-500">· next try {fmt(t.nextAttemptAt, tz)}</span>}
                  {t.externalPostId && <span className="text-xs text-neutral-500">· id {t.externalPostId}</span>}</div>
                {t.errorMessage && <p className="mt-1 text-xs text-red-700">{t.errorMessage}</p>}
                {t.status === 'UNCERTAIN' && <p className="mt-1 text-xs text-orange-700">The provider didn't confirm whether this was published. Check the account first; retrying may create a duplicate.</p>}
                <div className="mt-2 flex gap-2">
                  {workspace!.role !== 'VIEWER' && t.status === 'FAILED' && <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate({ tid: t.id, confirm: false })}>Retry</Button>}
                  {workspace!.role !== 'VIEWER' && t.status === 'UNCERTAIN' && <Confirm trigger="Retry anyway" title="Retry an uncertain post?" body="It may already be live. Retrying could publish it twice. Only continue if you've checked the account and it is missing." action="Retry anyway" onConfirm={() => retry.mutate({ tid: t.id, confirm: true })} />}
                  {t.attempts > 0 && <Button size="sm" variant="ghost" onClick={() => setOpenAttempts(openAttempts === t.id ? null : t.id)}>{openAttempts === t.id ? 'Hide history' : 'History'}</Button>}
                </div>
                {openAttempts === t.id && <ul className="mt-2 space-y-1 text-xs text-neutral-600">{attempts.data?.map((a) => <li key={a.id}>#{a.attemptNo} · {fmt(a.startedAt, tz)} · {a.outcome ?? 'in progress'}{a.providerCode ? ` (code ${a.providerCode})` : ''}{a.message ? ` — ${a.message}` : ''}</li>)}{attempts.isLoading && <li>Loading…</li>}</ul>}
              </li>))}</ul></Card>)}
      </div>
      <aside className="space-y-3">
        <h2 className="text-sm font-semibold">Previews</h2>
        {chosen.length === 0 && <p className="text-sm text-neutral-500">Select an account to see its preview.</p>}
        {chosen.map((a) => (
          <Card key={a.id} className="text-sm"><div className="mb-2 text-xs text-neutral-500">{a.platform} · {a.displayName}</div>
            <p className="whitespace-pre-wrap break-words">{compose(targets[a.id] || caption, tags, cta) || <span className="text-neutral-400">Empty</span>}</p>
            {picked.length > 0 && <div className="mt-2 flex gap-1">{picked.slice(0, 4).map((m) => m.mimeType.startsWith('image/') ? <img key={m.id} src={m.url} alt="" className="h-14 w-14 rounded object-cover" /> : <div key={m.id} className="flex h-14 w-14 items-center justify-center rounded bg-neutral-200 text-[9px] dark:bg-neutral-800">video</div>)}</div>}
            {post?.scheduledAt && <p className="mt-2 text-xs text-neutral-500">Scheduled {fmt(post.scheduledAt, tz)}</p>}
          </Card>))}
      </aside>
    </div>
  );
}
