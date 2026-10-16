'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';

export const useAdmin = <T,>(path: string, enabled = true, refetchMs?: number) =>
  useQuery({ queryKey: ['admin', path], queryFn: () => api<T>(`/admin${path}`), enabled, retry: false, refetchInterval: refetchMs });
export interface Paged<T> { total: number; page: number; pageSize: number; items: T[] }
export const dt = (d?: string | null) => (d ? new Date(d).toLocaleString() : '—');

export const Table = ({ head, children }: { head: string[]; children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
    <table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs text-neutral-500 dark:bg-neutral-900"><tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">{children}</tbody></table>
  </div>
);
export const Td = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
export function Pager({ page, pageSize, total, set }: { page: number; pageSize: number; total: number; set: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (<div className="flex items-center justify-between text-sm text-neutral-500"><span>{total} total</span>
    <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => set(page - 1)}>Previous</Button>{page} / {pages}<Button variant="outline" size="sm" disabled={page >= pages} onClick={() => set(page + 1)}>Next</Button></div></div>);
}
export const Err = ({ e }: { e: unknown }) => (e ? <p className="text-sm text-red-600">{(e as Error).message}</p> : null);
export const Unavail = ({ reason }: { reason: string }) => <span className="text-xs italic text-neutral-500">Unavailable — {reason}</span>;

/** Destructive admin actions always require a written reason, which goes into the audit log. */
export function ReasonDialog({ trigger, title, body, action, onSubmit, destructive = true }: { trigger: string; title: string; body: string; action: string; onSubmit: (reason: string) => void; destructive?: boolean }) {
  const [open, setOpen] = useState(false), [reason, setReason] = useState('');
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><Button size="sm" variant="outline">{trigger}</Button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900">
          <Dialog.Title className="font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-neutral-500">{body}</Dialog.Description>
          <Textarea className="mt-3" placeholder="Reason (recorded in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" variant={destructive ? 'destructive' : 'default'} disabled={reason.trim().length < 3} onClick={() => { onSubmit(reason.trim()); setOpen(false); setReason(''); }}>{action}</Button></div>
        </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  );
}
