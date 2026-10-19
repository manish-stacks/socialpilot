'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { inviteSchema } from '@/lib/schemas';
import { useApp } from '@/lib/app-context';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/form';
import { Card, CardDescription, CardHeader, CardTitle, Empty } from '@/components/ui/card';

interface Member {
  id: string;
  role: string;
  user: { id: string; email: string; name: string };
}

export default function TeamPage() {
  const { workspace, user } = useApp();
  const qc = useQueryClient();
  const [tokenMsg, setTokenMsg] = useState('');
  const id = workspace?.id;

  const members = useQuery({
    queryKey: ['members', id],
    queryFn: () => api<Member[]>(`/workspaces/${id}/members`),
    enabled: !!id,
  });

  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ email: string; role: 'ADMIN' | 'EDITOR' | 'VIEWER' }>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'VIEWER' },
  });

  const invite = useMutation({
    mutationFn: (v: object) =>
      api<{ token: string }>(`/workspaces/${id}/invitations`, {
        method: 'POST',
        body: JSON.stringify(v),
      }),
    onSuccess: (r) => {
      setTokenMsg(r.token);
      reset();
      toast.success('Invitation generated');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (mid: string) => api(`/workspaces/${id}/members/${mid}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', id] });
      toast.success('Member removed');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!workspace) return <p className="text-sm text-slate-500">Create a workspace first.</p>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Team Members &amp; Access Roles
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Collaborate on scheduled posts, media libraries, and AI prompts within {workspace.name}.
        </p>
      </div>

      {/* Team Roster */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-850">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Members ({members.data?.length ?? 0})
          </span>
        </div>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {members.data?.map((m) => {
            const isSelf = m.user.id === user.id;
            return (
              <li key={m.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 text-xs font-bold text-blue-600 border border-blue-500/20">
                    {m.user.name ? m.user.name.slice(0, 2).toUpperCase() : m.user.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{m.user.name || 'Team Member'}</span>
                      {isSelf && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{m.user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {m.role}
                  </span>
                  {canManage && m.role !== 'OWNER' && !isSelf && (
                    <button
                      onClick={() =>
                        confirm(`Remove ${m.user.name || m.user.email} from workspace?`) &&
                        remove.mutate(m.id)
                      }
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Invite Member Card */}
      {canManage && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invite New Teammate</CardTitle>
              <CardDescription>Grant workspace privileges to team members or agency clients</CardDescription>
            </div>
            <UserPlus className="h-4 w-4 text-slate-400" />
          </CardHeader>

          <form
            onSubmit={handleSubmit((v) => invite.mutate(v))}
            className="flex flex-col sm:flex-row gap-3 pt-2"
          >
            <div className="flex-1">
              <Input
                placeholder="colleague@company.com"
                className="text-xs"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            <Select className="w-full sm:w-36 text-xs" {...register('role')}>
              {workspace.role === 'OWNER' && <option value="ADMIN">ADMIN</option>}
              <option value="EDITOR">EDITOR</option>
              <option value="VIEWER">VIEWER</option>
            </Select>

            <Button variant="brand" disabled={invite.isPending} className="shrink-0">
              Generate Invite
            </Button>
          </form>

          {tokenMsg && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
              <div className="font-semibold flex items-center justify-between">
                <span>Invitation Token Generated</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tokenMsg);
                    toast.success('Token copied to clipboard');
                  }}
                  className="flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="mt-1 font-mono text-[11px] bg-white/70 p-2 rounded border border-blue-200/50 break-all select-all dark:bg-slate-900">
                {tokenMsg}
              </p>
              <p className="mt-1.5 text-slate-500">
                Send this token to your invitee to accept access under their account.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
