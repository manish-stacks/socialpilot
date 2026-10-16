'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, CreditCard, FileClock, Gauge, LayoutDashboard, Plug, Settings, Sparkles, Users, Building2 } from 'lucide-react';
import { api, ApiError, refreshSession } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [['/admin', 'Overview', LayoutDashboard], ['/admin/users', 'Users', Users], ['/admin/workspaces', 'Workspaces', Building2], ['/admin/billing', 'Plans & subscriptions', CreditCard],
  ['/admin/usage', 'Usage & AI', Sparkles], ['/admin/publishing', 'Publishing queue', Activity], ['/admin/integrations', 'Integrations', Plug], ['/admin/settings', 'System settings', Settings], ['/admin/audit', 'Audit log', FileClock]] as const;

/** UI gate only. The API enforces ADMIN on every /admin route; this just avoids rendering a shell for non-admins. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(), path = usePathname();
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading'), [email, setEmail] = useState('');
  useEffect(() => {
    (async () => {
      if (!(await refreshSession())) return router.replace('/login');
      try { const me = await api<{ email: string }>('/admin/me'); setEmail(me.email); setState('ok'); }
      catch (e) { if (e instanceof ApiError && (e.status === 403 || e.status === 401)) setState('denied'); else setState('denied'); }
    })();
  }, [router]);
  if (state === 'loading') return <div className="p-10 text-sm text-neutral-500">Checking access…</div>;
  if (state === 'denied') return <div className="mx-auto max-w-md p-10 text-center"><Gauge className="mx-auto mb-3" /><h1 className="text-xl font-semibold">Administrator access required</h1><p className="mt-2 text-sm text-neutral-500">Your account doesn't have admin permission. <Link className="underline" href="/dashboard">Back to the app</Link></p></div>;
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-1 font-semibold">{process.env.NEXT_PUBLIC_APP_NAME ?? 'SocialPilot AI'}</div><div className="mb-4 text-xs font-medium uppercase tracking-wide text-indigo-600">Admin</div>
        <nav className="space-y-1 text-sm">{NAV.map(([href, label, Icon]) => (
          <Link key={href} href={href} className={cn('flex items-center gap-2 rounded px-2 py-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800', (href === '/admin' ? path === href : path.startsWith(href)) && 'bg-neutral-200 font-medium dark:bg-neutral-800')}><Icon size={16} />{label}</Link>))}</nav>
        <div className="mt-8 text-xs text-neutral-500">{email}</div><Link className="mt-2 inline-block text-xs underline" href="/dashboard">← Customer app</Link>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
