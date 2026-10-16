'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, setToken, User, Workspace } from '@/lib/api';

import { BarChart3, Calendar, CreditCard, FileText, Image as ImageIcon, LayoutDashboard, Link2, Settings, Sparkles, Users } from 'lucide-react';
import { AppCtx } from '@/lib/app-context';

const NAV = [
  ['/dashboard', 'Overview', LayoutDashboard], ['/ai-studio', 'AI Studio', Sparkles], ['/posts', 'Posts', FileText], ['/calendar', 'Calendar', Calendar],
  ['/media', 'Media', ImageIcon], ['/accounts', 'Accounts', Link2], ['/analytics', 'Analytics', BarChart3], ['/team', 'Team', Users],
  ['/settings', 'Settings', Settings], ['/billing', 'Billing', CreditCard],
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => { refreshSession().then((ok) => (ok ? setReady(true) : router.replace('/login'))); }, [router]);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me'), enabled: ready });
  const ws = useQuery({ queryKey: ['workspaces'], queryFn: () => api<Workspace[]>('/workspaces'), enabled: ready });
  useEffect(() => { setActiveId(localStorage.getItem('sp_ws')); }, []); // non-sensitive UI preference only

  if (!ready || me.isLoading || ws.isLoading || !me.data) return <div className="p-10 text-sm text-neutral-500">Loading…</div>;
  const list = ws.data ?? [];
  const workspace = list.find((w) => w.id === activeId) ?? list[0] ?? null;
  const select = (id: string) => { localStorage.setItem('sp_ws', id); setActiveId(id); };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setToken(null); qc.clear(); router.replace('/login'); };

  return (
    <AppCtx.Provider value={{ user: me.data, workspace, workspaces: list, select }}>
      <div className="flex min-h-screen">
        <aside className="w-60 shrink-0 border-r border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-4 font-semibold">{process.env.NEXT_PUBLIC_APP_NAME ?? 'SocialPilot AI'}</div>
          {list.length > 0 && (
            <select aria-label="Workspace" className="input mb-4" value={workspace?.id} onChange={(e) => select(e.target.value)}>
              {list.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          <nav className="space-y-1 text-sm">
            {NAV.map(([href, label, Icon]) => (
              <Link key={href} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800" href={href}><Icon size={16} />{label}</Link>
            ))}
          </nav>
          {me.data.systemRole === 'ADMIN' && <Link className="mt-4 block rounded px-2 py-1.5 text-sm text-indigo-600 hover:bg-neutral-100 dark:hover:bg-neutral-800" href="/admin">Admin console →</Link>}
          <div className="mt-8 text-xs text-neutral-500">{me.data.email}</div>
          <button onClick={logout} className="btn-ghost mt-2">Log out</button>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </AppCtx.Provider>
  );
}
