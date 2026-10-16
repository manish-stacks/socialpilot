'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { Account, wsPath } from '@/lib/types';
import { fmt } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, Empty } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';

interface Provider { platform: string; oauthImplemented: boolean; configured: boolean; mock: boolean; note: string }

export default function Accounts() {
  const { workspace } = useApp();
  const id = workspace?.id, qc = useQueryClient();
  const [name, setName] = useState('');
  const accounts = useQuery({ queryKey: ['accounts', id], queryFn: () => api<Account[]>(wsPath(id!, '/accounts')), enabled: !!id });
  const providers = useQuery({ queryKey: ['providers', id], queryFn: () => api<Provider[]>(wsPath(id!, '/accounts/providers')), enabled: !!id });
  const inv = () => qc.invalidateQueries({ queryKey: ['accounts', id] });
  const mock = useMutation({ mutationFn: () => api(wsPath(id!, '/accounts/mock'), { method: 'POST', body: JSON.stringify({ name }) }), onSuccess: () => { setName(''); inv(); toast.success('Mock account created'); }, onError: (e) => toast.error((e as Error).message) });
  const del = useMutation({ mutationFn: (a: string) => api(wsPath(id!, `/accounts/${a}`), { method: 'DELETE' }), onSuccess: () => { inv(); toast.success('Account disconnected'); }, onError: (e) => toast.error((e as Error).message) });
  const startMeta = useMutation({ mutationFn: () => api<{ url: string }>(wsPath(id!, '/accounts/meta/start'), { method: 'POST' }), onSuccess: (r) => { window.location.href = r.url; }, onError: (e) => toast.error((e as Error).message) });
  const reval = useMutation({ mutationFn: (a: string) => api<{ status: string }>(wsPath(id!, `/accounts/meta/${a}/revalidate`), { method: 'POST' }), onSuccess: (r) => { inv(); r.status === 'ACTIVE' ? toast.success('Connection is healthy') : toast.error('Authorization expired. Reconnect this account.'); }, onError: (e) => toast.error((e as Error).message) });
  const metaCfg = providers.data?.find((p) => p.platform === 'FACEBOOK');
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  if (!workspace) return null;
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Connected accounts</h1>
      {accounts.data?.length === 0 && <Empty>No accounts connected yet.</Empty>}
      <ul className="space-y-3">{accounts.data?.map((a) => (
        <Card key={a.id} className="flex items-center justify-between gap-4">
          <div><div className="font-medium">{a.displayName} <span className="text-xs text-neutral-500">· {a.platform}</span></div>
            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500"><Badge value={a.status} />
              {a.tokenExpiresAt ? `Token expires ${fmt(a.tokenExpiresAt, workspace.timezone)}` : 'No expiry recorded'}
              · max {a.rules.maxCaption} chars{a.rules.requiresMedia ? ' · media required' : ''}</div>
            {a.status !== 'ACTIVE' && <div className="mt-1 text-xs text-amber-700">This account needs reconnecting before posts can be scheduled.</div>}</div>
          <div className="flex gap-2">{(a.platform === 'FACEBOOK' || a.platform === 'INSTAGRAM') && workspace.role !== 'VIEWER' && <Button size="sm" variant="outline" disabled={reval.isPending} onClick={() => reval.mutate(a.id)}>Check connection</Button>}
            {a.status !== 'ACTIVE' && canManage && metaCfg?.configured && <Button size="sm" onClick={() => startMeta.mutate()}>Reconnect</Button>}
          {canManage && <Confirm trigger="Disconnect" title={`Disconnect ${a.displayName}?`} body="This removes the account from the workspace. It's blocked if posts still reference it." action="Disconnect" onConfirm={() => del.mutate(a.id)} />}</div>
        </Card>))}</ul>
      <Card>
        <CardTitle>Add an account</CardTitle>
        {metaCfg?.oauthImplemented && canManage && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="text-sm"><div className="font-medium">Facebook Pages &amp; Instagram</div><div className="text-xs text-neutral-500">{metaCfg.note} Instagram must be a professional account linked to the Page.</div></div>
            <Button disabled={!metaCfg.configured || startMeta.isPending} onClick={() => startMeta.mutate()}>Connect with Meta</Button>
          </div>)}
        <ul className="mt-3 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">{providers.data?.filter((p) => !p.mock && p.platform !== 'FACEBOOK' && p.platform !== 'INSTAGRAM').map((p) => (
          <li key={p.platform} className="flex items-center justify-between py-2"><span>{p.platform}</span><span className="text-xs text-neutral-500">{p.note}</span></li>))}</ul>
        {providers.data?.some((p) => p.mock) && canManage && (
          <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="mb-2 text-xs text-neutral-500">Development only: a MOCK account never publishes anywhere. Use it to test scheduling.</p>
            <div className="flex gap-2"><Input placeholder="Mock account name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button disabled={name.trim().length < 2 || mock.isPending} onClick={() => mock.mutate()}>Create</Button></div>
          </div>)}
      </Card>
    </div>
  );
}
