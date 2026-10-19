'use client';
import { useState } from 'react';
import {
  Calendar,
  Code,
  FileClock,
  Filter,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { Input } from '@/components/ui/form';
import { Err, Paged, Pager, Table, Td, dt, useAdmin } from '@/components/admin/kit';

interface A {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  workspaceId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; email: string } | null;
}

export default function AuditPage() {
  const [action, setAction] = useState('');
  const [ws, setWs] = useState('');
  const [page, setPage] = useState(1);

  const q = useAdmin<Paged<A>>(
    `/audit?page=${page}&pageSize=50${action ? `&action=${encodeURIComponent(action)}` : ''}${
      ws ? `&workspaceId=${encodeURIComponent(ws)}` : ''
    }`
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Security &amp; Compliance Audit Trail
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Immutable event ledger recording destructive actions, administrative overrides, and system changes.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-10"
            placeholder="Filter by action (e.g. admin.suspend_user, post.publish)…"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Filter by Workspace ID…"
            value={ws}
            onChange={(e) => {
              setWs(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Err e={q.error} />

      {/* Audit Log Table */}
      <div className="space-y-4">
        <Table head={['Timestamp', 'Actor', 'Action Event', 'Target Reference', 'Metadata Payload']}>
          {q.data?.items.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <Td className="whitespace-nowrap text-xs font-mono text-slate-500">
                {dt(a.createdAt)}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {a.actor?.email ? a.actor.email.slice(0, 1).toUpperCase() : 'S'}
                  </div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {a.actor?.email ?? 'System Automated'}
                  </span>
                </div>
              </Td>
              <Td>
                <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {a.action}
                </span>
              </Td>
              <Td className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                {a.targetType ? `${a.targetType} · ` : ''}
                <span className="truncate max-w-[120px] inline-block align-bottom">{a.targetId ?? '—'}</span>
              </Td>
              <Td className="max-w-md">
                {a.metadata ? (
                  <pre className="max-h-16 overflow-auto rounded-lg bg-slate-100 p-2 font-mono text-[10px] text-slate-700 dark:bg-slate-850 dark:text-slate-300">
                    {JSON.stringify(a.metadata, null, 2)}
                  </pre>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>

        {q.data && (
          <Pager
            page={q.data.page}
            pageSize={q.data.pageSize}
            total={q.data.total}
            set={setPage}
          />
        )}
      </div>
    </div>
  );
}
