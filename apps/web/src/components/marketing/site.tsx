'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, CalendarClock, Check, ChevronDown, Image as ImageIcon, Menu, Repeat, ShieldCheck, Sparkles, Users, Wand2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from './logo';
import { PlatformBadge, PlatformIcon, type PlatformKey } from './icons';

export const APP = process.env.NEXT_PUBLIC_APP_NAME ?? 'SocialPilot AI';
export const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';
const NAV = [['/features', 'Features'], ['/how-it-works', 'How it works'], ['/pricing', 'Pricing'], ['/integrations', 'Integrations'], ['/faq', 'FAQ'], ['/contact', 'Contact']] as const;
export const cta = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-600/40';
export const ghost = 'inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white/60 px-5 py-2.5 text-sm font-semibold text-neutral-800 backdrop-blur transition hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:hover:bg-neutral-900';

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#faf7f2]/85 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Home" ><Logo size="lg" /></Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">{NAV.map(([h, l]) => <Link key={h} href={h} className="rounded-lg px-3 py-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white">{l}</Link>)}</nav>
        <div className="hidden items-center gap-2 md:flex"><Link className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900" href="/login">Log in</Link><Link className={cta} href="/register">Get started</Link></div>
        <button aria-label="Menu" aria-expanded={open} className="rounded-lg p-2 hover:bg-neutral-100 md:hidden dark:hover:bg-neutral-900" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {open && <div className="space-y-1 border-t border-neutral-200 px-6 py-3 md:hidden dark:border-neutral-800">
        {NAV.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900">{l}</Link>)}
        <div className="flex gap-2 pt-2"><Link className={ghost} href="/login">Log in</Link><Link className={cta} href="/register">Get started</Link></div></div>}
    </header>
  );
}

export function Footer() {
  const col = 'block py-1 text-neutral-500 transition hover:text-neutral-900 dark:hover:text-white';
  return (
    <footer className="mt-24 border-t border-stone-200 bg-stone-100/60 dark:border-neutral-800 dark:bg-neutral-900/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2"><Logo /><p className="mt-3 max-w-xs text-neutral-500">Plan, generate and publish social content from one workspace, using official platform APIs.</p></div>
        <div><div className="mb-2 font-semibold">Product</div>{NAV.slice(0, 4).map(([h, l]) => <Link key={h} href={h} className={col}>{l}</Link>)}</div>
        <div><div className="mb-2 font-semibold">Company</div><Link href="/faq" className={col}>FAQ</Link><Link href="/contact" className={col}>Contact</Link>{SUPPORT && <a href={`mailto:${SUPPORT}`} className={col}>{SUPPORT}</a>}</div>
        <div><div className="mb-2 font-semibold">Legal</div><Link href="/privacy" className={col}>Privacy Policy</Link><Link href="/terms" className={col}>Terms of Service</Link></div>
      </div>
      <div className="border-t border-neutral-200 py-5 text-center text-xs text-neutral-500 dark:border-neutral-800">© {new Date().getFullYear()} {APP}. All rights reserved.</div>
    </footer>
  );
}

export const Section = ({ title, sub, children, id, eyebrow }: { title: string; sub?: string; children: React.ReactNode; id?: string; eyebrow?: string }) => (
  <section id={id} className="mx-auto max-w-6xl px-6 py-16">
    {(title || sub) && <div className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-600">{eyebrow}</div>}
      {title && <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>}{sub && <p className="mt-3 text-neutral-600 dark:text-neutral-400">{sub}</p>}</div>}
    {children}
  </section>
);
export const PageHead = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-3xl rounded-full bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl" />
    <div className="relative mx-auto max-w-3xl px-6 pb-4 pt-20 text-center"><h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>{sub && <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">{sub}</p>}</div>
  </div>
);

export const FEATURES = [
  [Sparkles, 'AI Studio', 'Generate ideas and platform-specific captions, hashtags and calls to action with Google Gemini. Rewrite, shorten, expand, translate or change tone. You edit and approve everything.'],
  [Wand2, 'Post composer', 'One caption, per-account overrides, live character counts against each platform limit, media attachments and a preview for every selected account.'],
  [CalendarClock, 'Scheduling calendar', 'Schedule in your workspace timezone (stored in UTC). Month view with platform and account filters; reschedule or cancel pending posts.'],
  [Repeat, 'Reliable publishing', 'Each account is published independently with automatic retries. If an outcome is unclear, the post is flagged instead of being sent twice.'],
  [ImageIcon, 'Media library', 'Upload images and video to your own object storage, reuse assets across posts, and delete only when safe.'],
  [Users, 'Teams & clients', 'Separate workspaces per client with owner, admin, editor and viewer roles enforced on the server, plus an audit trail.'],
  [BarChart3, 'Honest analytics', 'Publishing results over time, by platform, with CSV export. Metrics a platform does not provide are shown as unavailable, never as zero.'],
  [ShieldCheck, 'Secure by design', 'Encrypted account tokens, official OAuth only, and workspace-level isolation of all your data.'],
] as const;
export const FAQS = [
  ['Which platforms are supported?', 'Facebook Pages and Instagram (professional accounts linked to a Page) are implemented through Meta’s official APIs. LinkedIn, TikTok, YouTube and X are planned and not available yet.'],
  ['Do you use official APIs?', 'Yes. Accounts connect through each platform’s OAuth flow and posts are published through documented APIs only. There is no scraping or browser automation.'],
  ['Why can’t I connect my accounts right away?', 'Meta restricts publishing permissions until an app passes its review. Until the operator’s app is approved, only people with a role on that app can connect accounts.'],
  ['Is the AI output always correct?', 'No. AI drafts can contain mistakes. Nothing is published without you reviewing and scheduling it.'],
  ['What happens if a post fails?', 'Temporary errors are retried automatically with increasing delays. Permanent errors show the reason so you can fix and retry. If a result is unknown, the post is marked uncertain and needs your confirmation before another attempt.'],
  ['Can my team collaborate?', 'Yes. Invite members to a workspace as admin, editor or viewer. Permissions are enforced by the server.'],
  ['How is pricing decided?', 'Plans and limits are shown live on the pricing page. Paid checkout is not enabled yet.'],
] as const;
export const WORKFLOW = [['Connect', 'Link your Facebook Pages and Instagram accounts through official OAuth.'], ['Create', 'Draft with AI Studio or write in the composer; add media and tailor each account.'], ['Schedule', 'Pick a date and time in your timezone and review previews.'], ['Track', 'Watch per-account status, retry safe failures, and review results.']] as const;
export const PLATFORMS: [string, PlatformKey, boolean][] = [['Facebook Pages', 'facebook', true], ['Instagram', 'instagram', true], ['LinkedIn', 'linkedin', false], ['TikTok', 'tiktok', false], ['YouTube', 'youtube', false], ['X', 'x', false]];

export function Faq({ items = FAQS }: { items?: readonly (readonly [string, string])[] }) {
  return <div className="mx-auto max-w-3xl space-y-3">{items.map(([q, a]) => (
    <details key={q} className="group rounded-2xl border border-neutral-200 bg-white p-5 transition open:shadow-md dark:border-neutral-800 dark:bg-neutral-950">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{q}<ChevronDown size={18} className="shrink-0 text-neutral-400 transition group-open:rotate-180" /></summary>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{a}</p></details>))}</div>;
}
export const FeatureGrid = () => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{FEATURES.map(([Icon, t, d]) => (
    <div key={t} className="group rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_2px_0_0_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/10 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-violet-700">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30"><Icon size={20} /></div>
      <h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{d}</p></div>))}</div>
);
export const Steps = () => (
  <ol className="relative grid gap-5 md:grid-cols-4">
    <div className="pointer-events-none absolute left-[12%] right-[12%] top-6 hidden h-px bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 md:block" />
    {WORKFLOW.map(([t, d], i) => (
      <li key={t} className="relative rounded-2xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-950">
        <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-lg font-bold text-white shadow-lg shadow-violet-500/30">{i + 1}</div>
        <h3 className="font-semibold">{t}</h3><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{d}</p></li>))}</ol>
);
export const PlatformList = () => (
  <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">{PLATFORMS.map(([n, k, ok]) => (
    <div key={n} className={`flex items-center gap-3 rounded-3xl border p-4 ${ok ? 'border-stone-200 bg-white shadow-sm' : 'border-dashed border-stone-300 bg-transparent'}`}>
      <PlatformBadge k={k} size={44} className={ok ? '' : 'opacity-45 grayscale'} />
      <div><div className="text-sm font-semibold">{n}</div><div className={`text-xs ${ok ? 'font-medium text-green-600' : 'text-neutral-500'}`}>{ok ? '● Available now' : 'Coming later'}</div></div></div>))}</div>
);
export const PlatformRow = ({ size = 18 }: { size?: number }) => <span className="inline-flex items-center gap-3 text-neutral-500">{PLATFORMS.map(([n, k]) => <span key={n} title={n}><PlatformIcon k={k} size={size} /></span>)}</span>;

interface Plan { code: string; name: string; priceCents: number; aiCreditsPerMonth: number; maxAccounts: number }
type Cur = 'USD' | 'INR';
/** India (by timezone / locale) sees ₹, everyone else $. The browser guess can be overridden with the toggle. */
function guessCurrency(): Cur {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' || /-IN$/i.test(navigator.language)) return 'INR';
  } catch { /* default below */ }
  return 'USD';
}
const INCLUDED = ['Post composer & previews', 'Scheduling calendar', 'Media library', 'Team roles & audit trail', 'Publishing analytics'];
/** Live from the API; shows an honest message instead of invented prices if the API is unreachable. */
export function PlanCards() {
  const [data, setData] = useState<{ plans: Plan[]; inrPerUsd: number | null } | null>(null), [err, setErr] = useState(false), [cur, setCur] = useState<Cur>('USD');
  useEffect(() => { setCur(guessCurrency()); api<{ plans: Plan[]; inrPerUsd: number | null }>('/public/plans').then(setData).catch(() => setErr(true)); }, []);
  if (err) return <div className="mx-auto max-w-md rounded-3xl border border-dashed border-stone-300 p-8 text-center text-sm text-neutral-500">Pricing is temporarily unavailable. Please check back soon.</div>;
  if (!data) return <div className="grid gap-5 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-80 animate-pulse rounded-3xl bg-stone-200/60 dark:bg-neutral-900" />)}</div>;
  const rate = data.inrPerUsd, showInr = cur === 'INR' && !!rate;
  const money = (cents: number) => cents === 0 ? (showInr ? '₹0' : '$0')
    : showInr ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round((cents / 100) * rate! / 10) * 10)
    : `$${(cents / 100).toFixed(0)}`;
  return (<>
    {rate && <div className="mb-8 flex justify-center"><div className="inline-flex rounded-full border border-stone-300 bg-white p-1 text-sm shadow-sm" role="group" aria-label="Currency">
      {(['USD', 'INR'] as Cur[]).map((c) => <button key={c} onClick={() => setCur(c)} aria-pressed={cur === c} className={`rounded-full px-4 py-1.5 font-medium transition ${cur === c ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'}`}>{c === 'USD' ? '$ USD' : '₹ INR'}</button>)}</div></div>}
    <div className="grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4">{data.plans.map((p) => {
      const hot = p.code === 'pro';
      return (
        <div key={p.code} className={`relative flex flex-col rounded-3xl p-7 transition hover:-translate-y-1 ${hot ? 'bg-neutral-900 text-white shadow-2xl shadow-neutral-900/20 lg:-my-3' : 'border border-stone-200 bg-white hover:shadow-xl'}`}>
          {hot && <span className="absolute -top-3 left-6 -rotate-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-neutral-900 shadow">Recommended</span>}
          <h3 className="font-serif text-xl font-semibold">{p.name}</h3>
          <div className="mt-4 flex items-end gap-1"><span className="text-5xl font-extrabold tracking-tight">{money(p.priceCents)}</span><span className={`pb-1.5 text-sm ${hot ? 'text-white/70' : 'text-neutral-500'}`}>{p.priceCents ? '/ month' : 'forever'}</span></div>
          <div className={`my-6 h-px ${hot ? 'bg-white/20' : 'bg-stone-200'}`} />
          <ul className="flex-1 space-y-3 text-sm">
            {[`${p.aiCreditsPerMonth.toLocaleString(showInr ? 'en-IN' : 'en-US')} AI generations / month`, `${p.maxAccounts} connected accounts`, ...INCLUDED].map((f, i) => (
              <li key={f} className="flex items-start gap-2.5"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${hot ? 'bg-amber-300 text-neutral-900' : 'bg-green-100 text-green-700'}`}><Check size={11} strokeWidth={3} /></span><span className={i < 2 ? 'font-semibold' : hot ? 'text-white/85' : 'text-neutral-600'}>{f}</span></li>))}
          </ul>
          <Link href="/register" className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${hot ? 'bg-amber-300 text-neutral-900 hover:bg-amber-200' : 'bg-neutral-900 text-white hover:bg-neutral-700'}`}>{p.priceCents === 0 ? 'Start free' : 'Get started'}</Link>
        </div>);
    })}</div>
    <p className="mt-6 text-center text-xs text-neutral-500">{showInr ? `Shown in ₹ at about ₹${rate}/$, rounded. ` : ''}Everyone starts on the free plan. Paid checkout isn’t enabled yet; contact us if you need higher limits.</p></>);
}
