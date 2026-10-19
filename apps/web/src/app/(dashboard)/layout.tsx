'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { api, refreshSession, setToken, User, Workspace } from '@/lib/api';
import { AppCtx } from '@/lib/app-context';
import { Logo } from '@/components/marketing/logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/form';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/ai-studio', label: 'AI Studio', icon: Sparkles, badge: 'Smart' },
  { href: '/posts', label: 'Posts & Drafts', icon: FileText },
  { href: '/calendar', label: 'Schedule Calendar', icon: Calendar },
  { href: '/media', label: 'Media Library', icon: ImageIcon },
  { href: '/accounts', label: 'Social Channels', icon: Link2 },
  { href: '/analytics', label: 'Performance', icon: BarChart3 },
  { href: '/team', label: 'Team Members', icon: Users },
  { href: '/settings', label: 'Workspace Settings', icon: Settings },
  { href: '/billing', label: 'Billing & Plan', icon: CreditCard },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsTz, setNewWsTz] = useState('UTC');

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setNewWsTz(detected);
    } catch {
      // fallback to UTC
    }
  }, []);

  useEffect(() => {
    refreshSession().then((ok) => (ok ? setReady(true) : router.replace('/login')));
  }, [router]);

  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User>('/auth/me'), enabled: ready });
  const ws = useQuery({ queryKey: ['workspaces'], queryFn: () => api<Workspace[]>('/workspaces'), enabled: ready });

  const createWs = useMutation({
    mutationFn: (body: { name: string; timezone: string }) =>
      api<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (newWs) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      select(newWs.id);
      setCreateWsOpen(false);
      setNewWsName('');
      toast.success(`Client workspace "${newWs.name}" created!`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  useEffect(() => {
    setActiveId(localStorage.getItem('sp_ws'));
  }, []);

  if (!ready || me.isLoading || ws.isLoading || !me.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" />
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading workspace…</p>
        </div>
      </div>
    );
  }

  const list = ws.data ?? [];
  const workspace = list.find((w) => w.id === activeId) ?? list[0] ?? null;

  const select = (id: string) => {
    localStorage.setItem('sp_ws', id);
    setActiveId(id);
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setToken(null);
    qc.clear();
    router.replace('/login');
  };

  const zonesList: string[] =
    typeof Intl !== 'undefined' && (Intl as any).supportedValuesOf
      ? (Intl as any).supportedValuesOf('timeZone')
      : ['UTC', 'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center px-5 border-b border-slate-200/80 dark:border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Workspace Switcher */}
        <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Client / Workspace
            </label>
            <button
              type="button"
              onClick={() => setCreateWsOpen(true)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 transition"
              title="Add New Client Workspace"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </button>
          </div>
          {list.length > 0 ? (
            <div className="relative">
              <select
                aria-label="Workspace"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 cursor-pointer"
                value={workspace?.id}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setCreateWsOpen(true);
                  } else {
                    select(e.target.value);
                  }
                }}
              >
                {list.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.role.toLowerCase()})
                  </option>
                ))}
                <option value="__NEW__">+ Add New Client…</option>
              </select>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateWsOpen(true)}
              className="w-full text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>Create Client Workspace</span>
            </Button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon, ...item }) => {
            const isActive = href === '/dashboard' ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                    )}
                  />
                  <span>{label}</span>
                </div>
                {'badge' in item && (
                  <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Administrator Quick-Entry Pill */}
        {me.data.systemRole === 'ADMIN' && (
          <div className="px-3 pt-2">
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-3 text-xs font-semibold text-purple-900 shadow-2xs transition hover:border-purple-300 dark:border-purple-900/40 dark:from-purple-950/40 dark:to-indigo-950/40 dark:text-purple-300"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Admin Console</span>
              </div>
              <span className="text-[10px] font-bold text-purple-600">Enter →</span>
            </Link>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="border-t border-slate-200/80 p-3.5 dark:border-slate-800/80">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-100/70 p-2.5 dark:bg-slate-800/50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
            {me.data.name ? me.data.name.slice(0, 2).toUpperCase() : me.data.email.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
              {me.data.name || me.data.email}
            </div>
            <div className="truncate text-[10px] text-slate-500">{me.data.email}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <AppCtx.Provider value={{ user: me.data, workspace, workspaces: list, select }}>
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

        {/* Main Workspace Frame */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Workspace:</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {workspace?.name ?? 'None'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {workspace && workspace.role !== 'VIEWER' && (
                <Button asChild size="sm" variant="brand" className="h-8 text-xs font-semibold">
                  <Link href="/posts/new">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Post</span>
                  </Link>
                </Button>
              )}
            </div>
          </header>

          {/* Page Body */}
          <main className="min-w-0 flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>

      {/* New Client Workspace Modal */}
      {createWsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => !createWs.isPending && setCreateWsOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => !createWs.isPending && setCreateWsOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  New Client Workspace
                </h3>
                <p className="text-xs text-slate-500">
                  Create an isolated space for a client's channels, posts &amp; assets.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newWsName.trim() || createWs.isPending) return;
                createWs.mutate({ name: newWsName.trim(), timezone: newWsTz });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="ws-name">Client or Brand Name *</Label>
                <Input
                  id="ws-name"
                  autoFocus
                  placeholder="e.g. Nike, RedBull, Dr. Sharma Clinic"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  disabled={createWs.isPending}
                />
              </div>

              <div>
                <Label htmlFor="ws-tz">Client Timezone</Label>
                <Select
                  id="ws-tz"
                  value={newWsTz}
                  onChange={(e) => setNewWsTz(e.target.value)}
                  disabled={createWs.isPending}
                >
                  {zonesList.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Scheduled posts for this client will fire according to this local timezone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateWsOpen(false)}
                  disabled={createWs.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  disabled={!newWsName.trim() || createWs.isPending}
                >
                  {createWs.isPending ? 'Creating…' : 'Create Workspace'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppCtx.Provider>
  );
}
