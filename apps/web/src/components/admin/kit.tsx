'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ShieldAlert, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form';
import { cn } from '@/lib/utils';

export const useAdmin = <T,>(path: string, enabled = true, refetchMs?: number) =>
  useQuery({
    queryKey: ['admin', path],
    queryFn: () => api<T>(`/admin${path}`),
    enabled,
    retry: false,
    refetchInterval: refetchMs,
  });

export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export const dt = (d?: string | null) =>
  d
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(d))
    : '—';

export const Table = ({
  head,
  children,
  className = '',
}: {
  head: string[];
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800/80 dark:bg-slate-900',
      className
    )}
  >
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {children}
        </tbody>
      </table>
    </div>
  </div>
);

export const Td = ({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <td className={cn('px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300', className)}>
    {children}
  </td>
);

export function Pager({
  page,
  pageSize,
  total,
  set,
}: {
  page: number;
  pageSize: number;
  total: number;
  set: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
      <div>
        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> records
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => set(page - 1)}
          className="h-8 px-2.5"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </Button>
        <span className="px-2 font-medium">
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => set(page + 1)}
          className="h-8 px-2.5"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export const Err = ({ e }: { e: unknown }) => {
  if (!e) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
      <div>
        <div className="font-semibold">Operation failed</div>
        <div className="text-xs text-rose-700 dark:text-rose-400">{(e as Error).message}</div>
      </div>
    </div>
  );
};

export const Unavail = ({ reason }: { reason: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
    <span>Unavailable — {reason}</span>
  </span>
);

/** Destructive admin actions always require a written reason, which goes into the audit log. */
export function ReasonDialog({
  trigger,
  title,
  body,
  action,
  onSubmit,
  destructive = true,
}: {
  trigger: string;
  title: string;
  body: string;
  action: string;
  onSubmit: (reason: string) => void;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant={destructive ? 'destructive' : 'outline'}>
          {trigger}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  destructive
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                )}
              >
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </Dialog.Title>
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Audit Logging Required
                </div>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {body}
          </Dialog.Description>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Reason for this action <span className="text-rose-500">*</span>
            </label>
            <Textarea
              className="text-xs"
              placeholder="Explain why this action is being taken (permanently recorded in the audit trail)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={destructive ? 'destructive' : 'brand'}
              disabled={reason.trim().length < 3}
              onClick={() => {
                onSubmit(reason.trim());
                setOpen(false);
                setReason('');
              }}
            >
              {action}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
