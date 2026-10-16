'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/form';
import { Err, Paged, Pager, Table, Td, dt, useAdmin } from '@/components/admin/kit';

interface A { id: string; action: string; targetType: string | null; targetId: string | null; workspaceId: string | null; metadata: unknown; createdAt: string; actor: { id: string; email: string } | null }
export default function Audit() {
  const [action, setAction] = useState(''), [ws, setWs] = useState(''), [page, setPage] = useState(1);
  const q = useAdmin<Paged<A>>(`/audit?page=${page}&pageSize=50${action ? `&action=${encodeURIComponent(action)}` : ''}${ws ? `&workspaceId=${encodeURIComponent(ws)}` : ''}`);
  return (
    <div className="max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <div className="flex gap-2"><Input placeholder="Action prefix, e.g. admin. or post." value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} /><Input placeholder="Workspace ID" value={ws} onChange={(e) => { setWs(e.target.value); setPage(1); }} /></div><Err e={q.error} />
      <Table head={['When', 'Actor', 'Action', 'Target', 'Details']}>{q.data?.items.map((a) => (
        <tr key={a.id}><Td className="whitespace-nowrap text-xs">{dt(a.createdAt)}</Td><Td className="text-xs">{a.actor?.email ?? 'system'}</Td><Td className="font-mono text-xs">{a.action}</Td><Td className="text-xs">{a.targetType ?? ''} {a.targetId ?? ''}</Td>
          <Td className="max-w-md break-words font-mono text-[11px] text-neutral-600">{a.metadata ? JSON.stringify(a.metadata).slice(0, 240) : ''}</Td></tr>))}</Table>
      {q.data && <Pager page={q.data.page} pageSize={q.data.pageSize} total={q.data.total} set={setPage} />}
    </div>
  );
}
