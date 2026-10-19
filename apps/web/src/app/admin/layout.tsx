'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  CreditCard,
  ExternalLink,
  FileClock,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { api, ApiError, refreshSession, setToken } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/marketing/logo';
import { useQueryClient } from '@tanstack/react-query';

const NAV_GROUPS = [
  {
    title: 'Core',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/workspaces', label: 'Workspaces', icon: Building2 },
      { href: '/admin/billing', label: 'Plans & Billing', icon: CreditCard },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/usage', label: 'AI & Usage', icon: Sparkles },
      { href: '/admin/publishing', label: 'Publishing Queue', icon: Activity },
      { href: '/admin/integrations', label: 'Integrations', icon: Plug },
    ],
  },
  {
    title: 'Governance',
    items: [
      { href: '/admin/settings', label: 'System Settings', icon: Settings },
      { href: '/admin/audit', label: 'Audit Trail', icon: FileClock },
    ],
  },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [email, setEmail] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await refreshSession())) return router.replace('/login');
      try {
        const me = await api<{ email: string }>('/admin/me');
        setEmail(me.email);
        setState('ok');
      } catch (e) {
        if (e instanceof ApiError && (e.status === 403 || e.status === 401)) setState('denied');
        else setState('denied');
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setToken(null);
    qc.clear();
    router.replace('/login');
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" />
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Verifying administrator authorization…</p>
        </div>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <Gauge className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Administrator Access Required
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your current account credentials do not have system administrator privileges.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Return to Customer Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
            >
              Sign in with another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo size="lg" />
          </Link>
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 border border-blue-500/20">
            Admin
          </span>
        </div>

        {/* Navigation Groups */}
        <div className="space-y-6 px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </div>
              <nav className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const isActive = href === '/admin' ? path === href : path.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                        )}
                      />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Account */}
      <div className="border-t border-slate-200/80 p-3.5 dark:border-slate-800/80">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-100/70 p-2.5 dark:bg-slate-800/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
            {email.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {email}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Super Admin</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>App</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-medium text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
          >
            <LogOut className="h-3 w-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50/60 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-72 max-w-[80vw] flex-1 flex-col bg-white shadow-2xl dark:bg-slate-900">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Admin Console</span>
              <span>/</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {path === '/admin' ? 'Overview' : path.replace('/admin/', '').replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Cluster Online</span>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <span>Customer App</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
