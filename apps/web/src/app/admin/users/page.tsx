'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  KeyRound,
  Mail,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserMinus,
  UserX,
  Users as UsersIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/form';
import { Err, Paged, Pager, ReasonDialog, Table, Td, dt, useAdmin } from '@/components/admin/kit';
import { cn } from '@/lib/utils';

interface U {
  id: string;
  email: string;
  name: string;
  systemRole: string;
  status: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  workspaces: { id: string; name: string; role: string; plan: string }[];
}

interface Detail extends U {
  activeSessions: number;
  lastSignInAt: string | null;
  usage: { aiGenerations30d: number; postsCreated: number };
  recentActivity: { id: string; action: string; createdAt: string; metadata: unknown }[];
}

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useAdmin<Paged<U>>(
    `/users?page=${page}&pageSize=20${status ? `&status=${status}` : ''}${
      q ? `&q=${encodeURIComponent(q)}` : ''
    }`
  );
  const detail = useAdmin<Detail>(`/users/${sel}`, !!sel);

  const act = useMutation({
    mutationFn: (v: { id: string; op: 'suspend' | 'reactivate'; reason: string }) =>
      api(`/admin/users/${v.id}/${v.op}`, {
        method: 'POST',
        body: JSON.stringify({ reason: v.reason }),
      }),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          User Management
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          View registered accounts, verify multi-tenant access, and manage access restrictions.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Search by name, email, or user ID…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Account Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </Select>
        </div>
      </div>

      <Err e={list.error} />

      {/* Main Grid: List + Detail Drawer */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Users Table */}
        <div className="space-y-4">
          <Table head={['User', 'System Role', 'Status', 'Workspaces', 'Joined']}>
            {list.data?.items.map((u) => {
              const isSelected = sel === u.id;
              return (
                <tr
                  key={u.id}
                  onClick={() => setSel(u.id)}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-800/60',
                    isSelected && 'bg-blue-50/80 dark:bg-slate-800/90'
                  )}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 text-xs font-bold text-blue-600 border border-blue-500/20">
                        {u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {u.name || 'Unnamed User'}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {u.systemRole === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 border border-purple-500/20">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Standard</span>
                    )}
                  </Td>
                  <Td>
                    <Badge value={u.status === 'ACTIVE' ? 'ACTIVE' : 'REVOKED'} />
                  </Td>
                  <Td className="text-xs">
                    {u.workspaces.length === 0 ? (
                      <span className="text-slate-400">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.workspaces.map((w) => (
                          <span
                            key={w.id}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {w.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{dt(u.createdAt)}</Td>
                </tr>
              );
            })}
          </Table>

          {list.data && (
            <Pager
              page={list.data.page}
              pageSize={list.data.pageSize}
              total={list.data.total}
              set={setPage}
            />
          )}
        </div>

        {/* Selected User Details Sidebar */}
        <div>
          <Card className="sticky top-24">
            {!sel ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <UsersIcon className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                Select any user row to view details, active sessions, and access controls.
              </div>
            ) : detail.isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Loading user profile…
              </div>
            ) : (
              detail.data && (
                <div className="space-y-5 text-sm">
                  {/* User Profile Header */}
                  <div className="flex items-start gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
                      {detail.data.name
                        ? detail.data.name.slice(0, 2).toUpperCase()
                        : detail.data.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{detail.data.name}</CardTitle>
                      <div className="text-xs text-slate-500 truncate">{detail.data.email}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge value={detail.data.status === 'ACTIVE' ? 'ACTIVE' : 'REVOKED'} />
                        {detail.data.systemRole === 'ADMIN' && (
                          <span className="text-[10px] font-bold text-purple-600 uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-850">
                      <div className="text-slate-400">AI Gens (30d)</div>
                      <div className="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-100">
                        {detail.data.usage.aiGenerations30d}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-850">
                      <div className="text-slate-400">Posts Created</div>
                      <div className="mt-0.5 text-base font-bold text-slate-800 dark:text-slate-100">
                        {detail.data.usage.postsCreated}
                      </div>
                    </div>
                  </div>

                  {/* Security & Access Info */}
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Last Sign-in
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {dt(detail.data.lastSignInAt)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                        Active Sessions
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {detail.data.activeSessions}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        Email Verified
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {detail.data.emailVerifiedAt ? dt(detail.data.emailVerifiedAt) : 'Unverified'}
                      </span>
                    </div>
                  </div>

                  {/* Administrative Action */}
                  {detail.data.systemRole !== 'ADMIN' && (
                    <div className="pt-2">
                      {detail.data.status === 'ACTIVE' ? (
                        <ReasonDialog
                          trigger="Suspend User Account"
                          title={`Suspend ${detail.data.email}?`}
                          body="The user will be immediately logged out of all active sessions and blocked from signing in until an administrator reactivates the account."
                          action="Confirm Suspension"
                          destructive={true}
                          onSubmit={(reason) =>
                            act.mutate({ id: detail.data!.id, op: 'suspend', reason })
                          }
                        />
                      ) : (
                        <ReasonDialog
                          trigger="Reactivate User Account"
                          title={`Reactivate ${detail.data.email}?`}
                          body="Restores the user's ability to sign in and access workspaces."
                          action="Reactivate Account"
                          destructive={false}
                          onSubmit={(reason) =>
                            act.mutate({ id: detail.data!.id, op: 'reactivate', reason })
                          }
                        />
                      )}
                    </div>
                  )}

                  {/* Recent Activity Mini-Feed */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Recent Activity
                    </div>
                    {detail.data.recentActivity.length === 0 ? (
                      <p className="text-xs text-slate-400">No recorded audit logs.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {detail.data.recentActivity.slice(0, 5).map((a) => (
                          <li
                            key={a.id}
                            className="rounded bg-slate-50 p-2 text-slate-600 dark:bg-slate-850 dark:text-slate-400"
                          >
                            <div className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                              {a.action}
                            </div>
                            <div className="text-[10px] text-slate-400">{dt(a.createdAt)}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
