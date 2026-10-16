'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { wsPath } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Cand { pageId: string; name: string; instagram: { id: string; username: string | null } | null }
const ERRORS: Record<string, string> = { denied: 'Meta authorization was cancelled or denied.', invalid_state: 'That connection link expired or was already used. Start again.', exchange_failed: 'Meta did not complete the sign-in. Check app credentials and permissions, then try again.', missing_state: 'Invalid callback.' };

function Inner() {
  const sp = useSearchParams(), router = useRouter(), qc = useQueryClient();
  const { workspace, select } = useApp();
  const pending = sp.get('pending'), ws = sp.get('ws'), error = sp.get('error');
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => { if (ws && workspace?.id !== ws) select(ws); }, [ws, workspace?.id, select]);
  const q = useQuery({ queryKey: ['meta-pending', pending], enabled: !!pending && !!workspace && workspace.id === ws && !error, retry: false, queryFn: () => api<Cand[]>(wsPath(workspace!.id, `/accounts/meta/pending/${pending}`)) });
  const connect = useMutation({
    mutationFn: () => api<{ connected: number }>(wsPath(workspace!.id, '/accounts/meta/connect'), { method: 'POST', body: JSON.stringify({ stateId: pending, selections: sel }) }),
    onSuccess: (r) => { toast.success(`Connected ${r.connected} account(s)`); qc.invalidateQueries({ queryKey: ['accounts'] }); router.replace('/accounts'); }, onError: (e) => toast.error((e as Error).message),
  });
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Choose accounts to connect</h1>
      {error && <Card className="border-red-300 text-sm text-red-700">{ERRORS[error] ?? 'Connection failed.'} <Link className="underline" href="/accounts">Back to accounts</Link></Card>}
      {q.error && <Card className="text-sm text-red-700">{(q.error as Error).message} <Link className="underline" href="/accounts">Back</Link></Card>}
      {q.data?.length === 0 && <Card className="text-sm text-neutral-600">Meta returned no Pages for this login. Make sure you granted access to your Pages during authorization (and, for Business-owned Pages, the business_management permission). <Link className="underline" href="/accounts">Back</Link></Card>}
      {q.data && q.data.length > 0 && (<>
        <ul className="space-y-2">{q.data.map((c) => (
          <Card key={c.pageId} className="space-y-2 text-sm">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={sel.includes(`fb:${c.pageId}`)} onChange={() => toggle(`fb:${c.pageId}`)} />{c.name} <span className="text-xs font-normal text-neutral-500">Facebook Page</span></label>
            {c.instagram ? <label className="flex items-center gap-2"><input type="checkbox" checked={sel.includes(`ig:${c.instagram.id}`)} onChange={() => toggle(`ig:${c.instagram!.id}`)} />@{c.instagram.username ?? c.instagram.id} <span className="text-xs text-neutral-500">Instagram (linked)</span></label>
              : <p className="text-xs text-neutral-500">No Instagram professional account linked to this Page.</p>}
          </Card>))}</ul>
        <Button disabled={!sel.length || connect.isPending} onClick={() => connect.mutate()}>Connect {sel.length || ''} selected</Button>
      </>)}
    </div>
  );
}
export default function MetaSelect() { return <Suspense><Inner /></Suspense>; }
