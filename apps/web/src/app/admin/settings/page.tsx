'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Check,
  Clock,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/form';
import { Err, dt, useAdmin } from '@/components/admin/kit';

interface S {
  key: string;
  type: 'boolean' | 'string' | 'number';
  label: string;
  description: string;
  value: boolean | string | number;
  isDefault: boolean;
  updatedAt: string | null;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const q = useAdmin<S[]>('/settings');
  const [draft, setDraft] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (v: { key: string; value: unknown }) =>
      api(`/admin/settings/${v.key}`, {
        method: 'PUT',
        body: JSON.stringify({ value: v.value }),
      }),
    onSuccess: (_r, v) => {
      toast.success('System setting saved and broadcasted');
      setDraft((d) => {
        const n = { ...d };
        delete n[v.key];
        return n;
      });
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          System Configuration &amp; Feature Flags
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dynamic application-level controls. Updates propagate to API and background worker nodes within ~10 seconds.
        </p>
      </div>

      <Err e={q.error} />

      {/* Settings Grid */}
      <div className="space-y-4">
        {q.data?.map((s) => {
          const isDirty = draft[s.key] !== undefined;
          return (
            <Card key={s.key} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{s.label}</CardTitle>
                    <span className="font-mono text-[10px] text-slate-400">({s.key})</span>
                  </div>
                  <CardDescription className="mt-1">{s.description}</CardDescription>
                </div>

                {s.type === 'boolean' && (
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => save.mutate({ key: s.key, value: !s.value })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      s.value ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        s.value ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>

              {s.type === 'number' && (
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.01"
                    className="max-w-[200px]"
                    value={draft[s.key] ?? String(s.value)}
                    onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={!isDirty || save.isPending}
                    onClick={() => save.mutate({ key: s.key, value: Number(draft[s.key]) })}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </Button>
                </div>
              )}

              {s.type === 'string' && (
                <div className="space-y-3">
                  {s.key === 'ai_system_prompt' ? (
                    <Textarea
                      rows={5}
                      className="font-mono text-xs leading-relaxed"
                      value={draft[s.key] ?? (s.value as string)}
                      onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      value={draft[s.key] ?? (s.value as string)}
                      onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })}
                    />
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="brand"
                      disabled={!isDirty || save.isPending}
                      onClick={() => save.mutate({ key: s.key, value: draft[s.key] })}
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                <span>{s.isDefault ? 'Operating on default configuration' : 'Custom configuration active'}</span>
                <span>{s.updatedAt ? `Last modified ${dt(s.updatedAt)}` : 'Original default'}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
