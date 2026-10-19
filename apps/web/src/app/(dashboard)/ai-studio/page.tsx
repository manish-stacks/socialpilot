'use client';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowRight,
  Check,
  Copy,
  Languages,
  PenTool,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Variant {
  platform: string;
  caption: string;
  hashtags: string[];
  cta: string;
}

interface Res {
  mode: string;
  output: { ideas?: string[]; variants?: Variant[] };
  remaining: number;
}

const PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X'];

const REWRITES = [
  ['shorten', 'Shorten'],
  ['expand', 'Expand'],
  ['change_tone', 'Punchy tone'],
  ['improve', 'Enhance CTA'],
] as const;

export default function AiStudioPage() {
  const { workspace } = useApp();
  const router = useRouter();
  const qc = useQueryClient();
  const id = workspace?.id;

  const [f, setF] = useState({
    brandName: '',
    brandDescription: '',
    audience: '',
    industry: '',
    objective: '',
    topic: '',
    tone: 'Friendly & Professional',
    language: 'English',
    postType: '',
    cta: '',
    hashtagPrefs: '',
    mediaBrief: '',
  });

  const [platforms, setPlatforms] = useState<string[]>(['INSTAGRAM', 'LINKEDIN']);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const clean = () => Object.fromEntries(Object.entries(f).filter(([, v]) => v.trim()));

  const run = useMutation({
    mutationFn: (body: object) =>
      api<Res>(wsPath(id!, '/ai/generate'), { method: 'POST', body: JSON.stringify(body) }),
    onError: (e) => setError((e as Error).message),
    onSuccess: (r) => {
      setError('');
      setRemaining(r.remaining);
      qc.invalidateQueries({ queryKey: ['dashboard', id] });
    },
  });

  const ideasMut = () =>
    run.mutate({ ...clean(), mode: 'ideas' }, { onSuccess: (r) => setIdeas(r.output.ideas ?? []) });

  const variantsMut = () =>
    run.mutate(
      { ...clean(), mode: 'variants', platforms },
      { onSuccess: (r) => setVariants(r.output.variants ?? []) }
    );

  const rewrite = (i: number, instruction: string) =>
    run.mutate(
      {
        ...clean(),
        mode: 'rewrite',
        instruction,
        text: variants[i].caption,
        platforms: [variants[i].platform],
      },
      {
        onSuccess: (r) => {
          const v = r.output.variants?.[0];
          if (v) setVariants((a) => a.map((x, j) => (j === i ? { ...v, platform: x.platform } : x)));
        },
      }
    );

  const draft = useMutation({
    mutationFn: (v: Variant) =>
      api(wsPath(id!, '/posts'), {
        method: 'POST',
        body: JSON.stringify({
          caption: v.caption,
          hashtags: v.hashtags,
          cta: v.cta || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success('Saved to posts drafts');
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toComposer = (v: Variant) =>
    router.push(
      `/posts/new?caption=${encodeURIComponent(v.caption)}&hashtags=${encodeURIComponent(
        v.hashtags.join(' ')
      )}&cta=${encodeURIComponent(v.cta ?? '')}`
    );

  const copyText = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success('Copied to clipboard');
  };

  if (!workspace) return null;
  const canGen = workspace.role !== 'VIEWER' && f.topic.trim().length > 0 && !run.isPending;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>AI Studio</span>
            <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              Gemini Powered
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Generate tailored social media campaign concepts, high-converting captions, and platform variations.
          </p>
        </div>
        {remaining !== null && (
          <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-700 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{remaining} generations remaining this month</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Left Column: Brief & Generator Parameters */}
        <Card className="h-fit space-y-4">
          <CardHeader className="mb-2">
            <CardTitle>Creative Brief &amp; Context</CardTitle>
            <CardDescription>Tailor generation to your brand identity</CardDescription>
          </CardHeader>

          <div>
            <Label>Topic or Core Message *</Label>
            <Textarea
              className="min-h-[75px]"
              placeholder="e.g. Announcing our 2.0 release with real-time analytics and instant AI drafts..."
              value={f.topic}
              onChange={set('topic')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Brand Name</Label>
              <Input placeholder="e.g. Acme Corp" value={f.brandName} onChange={set('brandName')} />
            </div>
            <div>
              <Label>Industry</Label>
              <Input placeholder="e.g. SaaS / B2B" value={f.industry} onChange={set('industry')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target Audience</Label>
              <Input placeholder="e.g. Founders" value={f.audience} onChange={set('audience')} />
            </div>
            <div>
              <Label>Campaign Goal</Label>
              <Input placeholder="e.g. Sign-ups" value={f.objective} onChange={set('objective')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tone of Voice</Label>
              <Input value={f.tone} onChange={set('tone')} />
            </div>
            <div>
              <Label>Language</Label>
              <Input value={f.language} onChange={set('language')} />
            </div>
          </div>

          {/* Social Platforms checkboxes */}
          <div>
            <Label>Target Platforms</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setPlatforms((a) => (a.includes(p) ? a.filter((x) => x !== p) : [...a, p]))
                    }
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="brand"
              disabled={!canGen || platforms.length === 0}
              onClick={variantsMut}
            >
              <Sparkles className="h-4 w-4" />
              <span>{run.isPending ? 'Generating Captions…' : 'Generate Multi-Platform Captions'}</span>
            </Button>
            <Button
              variant="outline"
              disabled={!canGen}
              onClick={ideasMut}
            >
              <Wand2 className="h-4 w-4" />
              <span>Generate Concept Ideas</span>
            </Button>
          </div>
        </Card>

        {/* Right Column: AI Output Studio */}
        <div className="space-y-6">
          {/* Post Ideas Area */}
          {ideas.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Creative Post Angles &amp; Ideas</CardTitle>
                  <CardDescription>Click any idea to populate into your prompt</CardDescription>
                </div>
              </CardHeader>
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                {ideas.map((idea, i) => (
                  <div
                    key={i}
                    onClick={() => setF((s) => ({ ...s, topic: idea }))}
                    className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-xs text-slate-700 transition hover:border-blue-500 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300"
                  >
                    <div className="font-semibold text-blue-600 mb-1">Concept {i + 1}</div>
                    <div>{idea}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Generated Variants */}
          {variants.length === 0 && ideas.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600/10 to-purple-600/10 text-blue-600 mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Ready to generate engaging content
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Enter your campaign topic on the left and click Generate to produce customized posts for Instagram, LinkedIn, Facebook, and more.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {variants.map((v, i) => (
              <Card key={i} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      {v.platform}
                    </span>
                    <span className="text-xs text-slate-400">Tailored Variant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyText(`${v.caption}\n\n${v.hashtags.join(' ')}`)}
                      className="h-7 text-xs"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toComposer(v)}
                      className="h-7 text-xs"
                    >
                      <Send className="h-3 w-3" />
                      <span>Open Composer</span>
                    </Button>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {v.caption}
                </div>

                {v.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-xs text-blue-600 dark:text-blue-400">
                    {v.hashtags.map((h, hi) => (
                      <span key={hi}>#{h.replace(/^#/, '')}</span>
                    ))}
                  </div>
                )}

                {/* Rewrite Suggestions Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1">Refine:</span>
                  {REWRITES.map(([instr, label]) => (
                    <button
                      key={instr}
                      onClick={() => rewrite(i, instr)}
                      disabled={run.isPending}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300"
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => draft.mutate(v)}
                    disabled={draft.isPending}
                    className="ml-auto rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                  >
                    Save as Draft
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
