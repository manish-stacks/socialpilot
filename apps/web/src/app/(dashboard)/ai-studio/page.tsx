'use client';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/form';
import { Card } from '@/components/ui/card';

interface Variant { platform: string; caption: string; hashtags: string[]; cta: string }
interface Res { mode: string; output: { ideas?: string[]; variants?: Variant[] }; remaining: number }
const PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X'];
const REWRITES = [['shorten', 'Shorten'], ['expand', 'Expand'], ['change_tone', 'Change tone'], ['translate', 'Translate'], ['improve', 'Improve']] as const;

export default function AiStudio() {
  const { workspace } = useApp();
  const router = useRouter(), qc = useQueryClient();
  const id = workspace?.id;
  const [f, setF] = useState({ brandName: '', brandDescription: '', audience: '', industry: '', objective: '', topic: '', tone: 'Friendly', language: 'English', postType: '', cta: '', hashtagPrefs: '', mediaBrief: '' });
  const [platforms, setPlatforms] = useState<string[]>(['INSTAGRAM']);
  const [ideas, setIdeas] = useState<string[]>([]), [variants, setVariants] = useState<Variant[]>([]), [error, setError] = useState(''), [remaining, setRemaining] = useState<number | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const clean = () => Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()));
  const run = useMutation({
    mutationFn: (body: object) => api<Res>(wsPath(id!, '/ai/generate'), { method: 'POST', body: JSON.stringify(body) }),
    onError: (e) => setError((e as Error).message), onSuccess: (r) => { setError(''); setRemaining(r.remaining); qc.invalidateQueries({ queryKey: ['dashboard', id] }); },
  });
  const ideasMut = () => run.mutate({ ...clean(), mode: 'ideas' }, { onSuccess: (r) => setIdeas(r.output.ideas ?? []) });
  const variantsMut = () => run.mutate({ ...clean(), mode: 'variants', platforms }, { onSuccess: (r) => setVariants(r.output.variants ?? []) });
  const rewrite = (i: number, instruction: string) => run.mutate({ ...clean(), mode: 'rewrite', instruction, text: variants[i].caption, platforms: [variants[i].platform] },
    { onSuccess: (r) => { const v = r.output.variants?.[0]; if (v) setVariants((a) => a.map((x, j) => (j === i ? { ...v, platform: x.platform } : x))); } });
  const draft = useMutation({
    mutationFn: (v: Variant) => api(wsPath(id!, '/posts'), { method: 'POST', body: JSON.stringify({ caption: v.caption, hashtags: v.hashtags, cta: v.cta || undefined }) }),
    onSuccess: () => { toast.success('Saved as draft'); qc.invalidateQueries({ queryKey: ['posts'] }); }, onError: (e) => toast.error((e as Error).message),
  });
  const toComposer = (v: Variant) => router.push(`/posts/new?caption=${encodeURIComponent(v.caption)}&hashtags=${encodeURIComponent(v.hashtags.join(' '))}&cta=${encodeURIComponent(v.cta ?? '')}`);
  if (!workspace) return null;
  const canGen = workspace.role !== 'VIEWER' && f.topic.trim().length > 0 && !run.isPending;
  const text = (v: Variant) => [v.caption, v.cta, v.hashtags.map((h) => '#' + h.replace(/^#/, '')).join(' ')].filter(Boolean).join('\n\n');
  return (
    <div className="grid max-w-6xl gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">AI Studio</h1>
        <div><Label>Topic or prompt *</Label><Textarea value={f.topic} onChange={set('topic')} /></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Brand name</Label><Input value={f.brandName} onChange={set('brandName')} /></div><div><Label>Industry</Label><Input value={f.industry} onChange={set('industry')} /></div></div>
        <div><Label>Brand description</Label><Textarea className="min-h-[60px]" value={f.brandDescription} onChange={set('brandDescription')} /></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Target audience</Label><Input value={f.audience} onChange={set('audience')} /></div><div><Label>Campaign objective</Label><Input value={f.objective} onChange={set('objective')} /></div></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Tone</Label><Input value={f.tone} onChange={set('tone')} /></div>
          <div><Label>Language</Label><Input list="langs" value={f.language} onChange={set('language')} /><datalist id="langs"><option>English</option><option>Hindi</option><option>Hinglish</option><option>Spanish</option><option>French</option></datalist></div></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Post type</Label><Input placeholder="Carousel, Reel, text…" value={f.postType} onChange={set('postType')} /></div><div><Label>Call to action</Label><Input value={f.cta} onChange={set('cta')} /></div></div>
        <div><Label>Hashtag preferences</Label><Input value={f.hashtagPrefs} onChange={set('hashtagPrefs')} /></div>
        <div><Label>Media brief</Label><Input value={f.mediaBrief} onChange={set('mediaBrief')} /></div>
        <div><Label>Platforms</Label><div className="flex flex-wrap gap-2">{PLATFORMS.map((p) => (
          <label key={p} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={platforms.includes(p)} onChange={() => setPlatforms((a) => (a.includes(p) ? a.filter((x) => x !== p) : [...a, p]))} />{p}</label>))}</div></div>
        <div className="flex gap-2"><Button disabled={!canGen} onClick={ideasMut}>Generate ideas</Button><Button disabled={!canGen || platforms.length === 0} onClick={variantsMut}>Generate captions</Button></div>
        {remaining !== null && <p className="text-xs text-neutral-500">{remaining} AI generations left this month.</p>}
      </div>
      <div className="space-y-4">
        {run.isPending && <p className="text-sm text-neutral-500">Generating…</p>}
        {error && <Card className="border-red-300 text-sm text-red-700">{error}<div className="mt-2"><Button size="sm" variant="outline" disabled={!canGen} onClick={variantsMut}>Retry captions</Button></div></Card>}
        {!run.isPending && !error && ideas.length === 0 && variants.length === 0 && <p className="text-sm text-neutral-500">Results appear here. AI output can be wrong; review and edit everything before publishing.</p>}
        {ideas.length > 0 && <Card><h3 className="mb-2 text-sm font-semibold">Ideas</h3><ul className="space-y-2 text-sm">{ideas.map((i, k) => (
          <li key={k} className="flex items-start justify-between gap-3"><span>{i}</span><Button size="sm" variant="outline" onClick={() => setF((s) => ({ ...s, topic: i }))}>Use as topic</Button></li>))}</ul></Card>}
        {variants.map((v, i) => (
          <Card key={i}><div className="mb-2 text-xs font-medium text-neutral-500">{v.platform}</div>
            <Textarea value={v.caption} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2"><div><Label>Hashtags</Label><Input value={v.hashtags.join(' ')} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, hashtags: e.target.value.split(/[\s,]+/).filter(Boolean) } : x)))} /></div>
              <div><Label>CTA</Label><Input value={v.cta} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, cta: e.target.value } : x)))} /></div></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {REWRITES.map(([k, l]) => <Button key={k} size="sm" variant="ghost" disabled={run.isPending || workspace.role === 'VIEWER'} onClick={() => rewrite(i, k)}>{l}</Button>)}
              <span className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(text(v)).then(() => toast.success('Copied'))}>Copy</Button>
              <Button size="sm" variant="outline" disabled={draft.isPending || workspace.role === 'VIEWER'} onClick={() => draft.mutate(v)}>Save draft</Button>
              <Button size="sm" disabled={workspace.role === 'VIEWER'} onClick={() => toComposer(v)}>Open in composer</Button></div>
          </Card>))}
      </div>
    </div>
  );
}
