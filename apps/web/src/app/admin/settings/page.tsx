'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/form';
import { Err, dt, useAdmin } from '@/components/admin/kit';

interface S { key: string; type: 'boolean' | 'string'; label: string; description: string; value: boolean | string; isDefault: boolean; updatedAt: string | null }
export default function Settings() {
  const qc = useQueryClient(), q = useAdmin<S[]>('/settings'), [draft, setDraft] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: (v: { key: string; value: unknown }) => api(`/admin/settings/${v.key}`, { method: 'PUT', body: JSON.stringify({ value: v.value }) }),
    onSuccess: (_r, v) => { toast.success('Saved'); setDraft((d) => { const n = { ...d }; delete n[v.key]; return n; }); qc.invalidateQueries({ queryKey: ['admin'] }); }, onError: (e) => toast.error((e as Error).message) });
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">System settings</h1><Err e={q.error} />
      <p className="text-sm text-neutral-500">Application-level flags only. Secrets (API keys, tokens, client secrets) live in server environment variables and are never shown or editable here. Changes take effect within ~10 seconds and are audit-logged.</p>
      {q.data?.map((s) => (
        <Card key={s.key} className="space-y-2">
          <div className="flex items-start justify-between gap-4"><div><div className="font-medium">{s.label}</div><p className="text-xs text-neutral-500">{s.description}</p></div>
            {s.type === 'boolean' && <label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={s.value as boolean} disabled={save.isPending} onChange={(e) => save.mutate({ key: s.key, value: e.target.checked })} />{s.value ? 'On' : 'Off'}</label>}</div>
          {s.type === 'string' && (<div className="space-y-2">
            {s.key === 'ai_system_prompt' ? <Textarea rows={5} value={draft[s.key] ?? (s.value as string)} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} /> : <Input value={draft[s.key] ?? (s.value as string)} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value })} />}
            <Button size="sm" disabled={draft[s.key] === undefined || save.isPending} onClick={() => save.mutate({ key: s.key, value: draft[s.key] })}>Save</Button></div>)}
          <p className="text-[11px] text-neutral-500">{s.isDefault ? 'Using default' : `Last changed ${dt(s.updatedAt)}`}</p>
        </Card>))}
    </div>
  );
}
