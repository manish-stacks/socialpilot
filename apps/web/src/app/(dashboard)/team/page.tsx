'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { inviteSchema } from '@/lib/schemas';
import { useApp } from '@/lib/app-context';

interface Member { id: string; role: string; user: { id: string; email: string; name: string } }

export default function Team() {
  const { workspace, user } = useApp();
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const id = workspace?.id;
  const members = useQuery({ queryKey: ['members', id], queryFn: () => api<Member[]>(`/workspaces/${id}/members`), enabled: !!id });
  const canManage = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string; role: 'ADMIN' | 'EDITOR' | 'VIEWER' }>({
    resolver: zodResolver(inviteSchema), defaultValues: { role: 'VIEWER' },
  });
  const invite = useMutation({
    mutationFn: (v: object) => api<{ token: string }>(`/workspaces/${id}/invitations`, { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: (r) => { setMsg(`Invitation created. Email delivery isn't built yet — share this one-time token manually: ${r.token}`); reset(); },
    onError: (e) => setMsg((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: (mid: string) => api(`/workspaces/${id}/members/${mid}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', id] }),
    onError: (e) => setMsg((e as Error).message),
  });
  if (!workspace) return <p className="text-sm text-neutral-500">Create a workspace first.</p>;
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold">Team</h1>
      <ul className="card divide-y divide-neutral-200 p-0 dark:divide-neutral-800">
        {members.data?.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{m.user.name} <span className="text-neutral-500">· {m.user.email}</span></span>
            <span className="flex items-center gap-3"><span className="text-xs uppercase text-neutral-500">{m.role}</span>
              {canManage && m.role !== 'OWNER' && m.user.id !== user.id && (
                <button className="btn-ghost" onClick={() => confirm(`Remove ${m.user.name}?`) && remove.mutate(m.id)}>Remove</button>)}
            </span>
          </li>
        ))}
      </ul>
      {canManage && (
        <form onSubmit={handleSubmit((v) => invite.mutate(v))} className="card mt-6 flex flex-wrap items-start gap-3">
          <div className="flex-1"><input className="input" placeholder="Email" {...register('email')} /><p className="text-xs text-red-600">{errors.email?.message}</p></div>
          <select className="input w-32" {...register('role')}>{workspace.role === 'OWNER' && <option>ADMIN</option>}<option>EDITOR</option><option>VIEWER</option></select>
          <button className="btn" disabled={invite.isPending}>Invite</button>
        </form>
      )}
      {msg && <p role="status" className="mt-4 break-all text-sm text-neutral-600 dark:text-neutral-400">{msg}</p>}
    </div>
  );
}
