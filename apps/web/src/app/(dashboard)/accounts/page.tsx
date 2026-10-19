'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { Account, wsPath } from '@/lib/types';
import { fmt } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle, Empty } from '@/components/ui/card';
import { Confirm } from '@/components/ui/confirm';

interface Provider {
  platform: string;
  oauthImplemented: boolean;
  configured: boolean;
  mock: boolean;
  note: string;
}

export default function AccountsPage() {
  const { workspace } = useApp();
  const id = workspace?.id;
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const accounts = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => api<Account[]>(wsPath(id!, '/accounts')),
    enabled: !!id,
  });

  const providers = useQuery({
    queryKey: ['providers', id],
    queryFn: () => api<Provider[]>(wsPath(id!, '/accounts/providers')),
    enabled: !!id,
  });

  const inv = () => qc.invalidateQueries({ queryKey: ['accounts', id] });

  const mock = useMutation({
    mutationFn: () =>
      api(wsPath(id!, '/accounts/mock'), {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setName('');
      inv();
      toast.success('Mock testing channel linked');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: (a: string) => api(wsPath(id!, `/accounts/${a}`), { method: 'DELETE' }),
    onSuccess: () => {
      inv();
      toast.success('Channel disconnected');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const startMeta = useMutation({
    mutationFn: () =>
      api<{ url: string }>(wsPath(id!, '/accounts/meta/start'), { method: 'POST' }),
    onSuccess: (r) => {
      window.location.href = r.url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reval = useMutation({
    mutationFn: (a: string) =>
      api<{ status: string }>(wsPath(id!, `/accounts/meta/${a}/revalidate`), { method: 'POST' }),
    onSuccess: (r) => {
      inv();
      r.status === 'ACTIVE'
        ? toast.success('Connection authorization verified')
        : toast.error('OAuth token expired. Please re-authenticate.');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const metaCfg = providers.data?.find((p) => p.platform === 'FACEBOOK');
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  if (!workspace) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Social Channels &amp; Connections
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage authorized Meta Pages, Instagram business accounts, and scheduling permissions.
        </p>
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Connected Profiles ({accounts.data?.length ?? 0})
        </h2>

        {accounts.data?.length === 0 ? (
          <Empty
            icon={<Share2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
            className="py-10"
          >
            <p className="font-semibold text-slate-800 dark:text-slate-200">No channels linked</p>
            <p className="mt-1 text-xs text-slate-400">
              Connect a Facebook Page, Instagram account, or create a mock account below to begin publishing.
            </p>
          </Empty>
        ) : (
          <div className="space-y-3">
            {accounts.data?.map((a) => (
              <Card key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{a.displayName}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {a.platform}
                    </span>
                    <Badge value={a.status} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {a.tokenExpiresAt ? `Expires ${fmt(a.tokenExpiresAt, workspace.timezone)}` : 'No expiry'}
                    </span>
                    <span>·</span>
                    <span>Max {a.rules.maxCaption} characters</span>
                    {a.rules.requiresMedia && (
                      <>
                        <span>·</span>
                        <span className="text-blue-600 font-medium">Media attachment required</span>
                      </>
                    )}
                  </div>

                  {a.status !== 'ACTIVE' && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Re-authentication required to resume publishing.</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(a.platform === 'FACEBOOK' || a.platform === 'INSTAGRAM') && workspace.role !== 'VIEWER' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reval.isPending}
                      onClick={() => reval.mutate(a.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Check Token</span>
                    </Button>
                  )}
                  {a.status !== 'ACTIVE' && canManage && metaCfg?.configured && (
                    <Button size="sm" variant="brand" onClick={() => startMeta.mutate()}>
                      Reconnect
                    </Button>
                  )}
                  {canManage && (
                    <Confirm
                      trigger="Disconnect"
                      title={`Disconnect ${a.displayName}?`}
                      body="This removes the account from the workspace. It will be blocked if active posts still reference it."
                      action="Disconnect Channel"
                      onConfirm={() => del.mutate(a.id)}
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Connect New Channel Section */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Link New Channel</CardTitle>
            <CardDescription>Authorize profiles via official Graph API authentication</CardDescription>
          </div>
          <Link2 className="h-4 w-4 text-slate-400" />
        </CardHeader>

        {metaCfg?.oauthImplemented && canManage && (
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Facebook Pages &amp; Instagram Professional
              </div>
              <div className="mt-0.5 text-xs text-slate-500 max-w-md">
                {metaCfg.note} Connect verified Instagram creator/business profiles linked to your Facebook Page.
              </div>
            </div>
            <Button
              variant="brand"
              disabled={!metaCfg.configured || startMeta.isPending}
              onClick={() => startMeta.mutate()}
              className="shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Connect via Meta</span>
            </Button>
          </div>
        )}

        {/* Development MOCK Account Generator */}
        {providers.data?.some((p) => p.mock) && canManage && (
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div className="mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Development Test Channel (Sandbox Mock)
              </span>
              <p className="text-xs text-slate-500">
                Mock accounts safely simulate social posting without making calls to third-party APIs.
              </p>
            </div>
            <div className="flex gap-2 max-w-md">
              <Input
                placeholder="e.g. Test Twitter Feed"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={name.trim().length < 2 || mock.isPending}
                onClick={() => mock.mutate()}
              >
                Create Mock
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
