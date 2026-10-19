import Link from 'next/link';
import { Check } from 'lucide-react';
import { Faq, FeatureGrid, PlanCards, PlatformList, PlatformRow, Section, Steps, cta, ghost } from '@/components/marketing/site';
import { PlatformBadge } from '@/components/marketing/icons';

const WHO = [['🎨', 'Creators', 'Batch a week of posts in one sitting, and let the calendar remember the rest.'], ['💼', 'Freelancers', 'Keep each client’s accounts, drafts and approvals in their own tidy workspace.'], ['🏪', 'Small businesses', 'Show up consistently on Facebook and Instagram without a marketing team.'], ['🏢', 'Agencies', 'Invite teammates with the right role, and keep a clear record of who did what.']] as const;

function Mockup() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -left-4 -top-6 z-10 hidden -rotate-6 sm:block"><PlatformBadge k="instagram" size={56} className="shadow-xl" /></div>
      <div className="absolute -right-3 top-10 z-10 hidden rotate-6 sm:block"><PlatformBadge k="facebook" size={52} className="shadow-xl" /></div>
      <div className="absolute -bottom-5 left-16 z-10 hidden rotate-3 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-bold text-neutral-900 shadow-lg sm:block">You approve every post ✓</div>
      <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_30px_80px_-20px_rgba(60,40,20,0.35)]">
        <div className="flex items-center gap-1.5 border-b border-stone-200 bg-stone-50 px-4 py-3"><i className="h-3 w-3 rounded-full bg-red-400" /><i className="h-3 w-3 rounded-full bg-amber-400" /><i className="h-3 w-3 rounded-full bg-green-400" /><span className="ml-3 text-[11px] text-neutral-400">Product preview (illustration)</span></div>
        <div className="grid text-left md:grid-cols-[170px_1fr_1fr]">
          <aside className="hidden border-r border-stone-200 p-4 text-xs md:block">{['Overview', 'AI Studio', 'Posts', 'Calendar', 'Media', 'Accounts', 'Analytics'].map((n, i) => <div key={n} className={`mb-1 rounded-xl px-3 py-2 ${i === 1 ? 'bg-amber-100 font-semibold text-amber-900' : 'text-neutral-500'}`}>{n}</div>)}</aside>
          <div className="space-y-3 border-stone-200 p-5 md:border-r">
            <div className="text-xs font-semibold text-neutral-500">AI Studio</div>
            <div className="rounded-xl bg-stone-100 p-3 text-sm">Topic: announcing our autumn menu</div>
            <div className="rounded-2xl border border-stone-200 p-3 text-sm"><div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-pink-600"><PlatformBadge k="instagram" size={16} className="rounded-md" />INSTAGRAM</div>Fresh flavours are here. Come taste what’s new this season. <span className="text-violet-600">#autumnmenu #fresh</span></div>
            <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg border border-stone-200 px-2.5 py-1">Shorten</span><span className="rounded-lg border border-stone-200 px-2.5 py-1">Translate</span><span className="rounded-lg bg-neutral-900 px-2.5 py-1 text-white">Open in composer</span></div>
          </div>
          <div className="p-5"><div className="mb-3 text-xs font-semibold text-neutral-500">Calendar</div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
              {Array.from({ length: 21 }, (_, i) => <div key={i} className="h-9 rounded-lg border border-stone-100 p-1 text-left text-neutral-500">{i + 1}{[3, 8, 12, 17].includes(i) && <div className="mt-0.5 h-1.5 rounded bg-amber-400" />}</div>)}</div></div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (<>
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-10 -z-10 h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" /><div className="pointer-events-none absolute -right-32 top-32 -z-10 h-80 w-80 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="mx-auto max-w-5xl px-6 pb-12 pt-16 text-center sm:pt-24">
        <span className="inline-flex -rotate-1 items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-semibold text-amber-900">👋 Made for people who post, not for dashboards</span>
        <h1 className="mx-auto mt-7 max-w-4xl font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">Your social media, finally in{' '}
          <span className="relative whitespace-nowrap">one calm place<svg className="absolute -bottom-2 left-0 w-full text-amber-400" viewBox="0 0 300 12" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8c40-8 70 4 110-2s80-5 120 0 50 2 66-2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></span>.</h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600">Stop juggling tabs and sticky notes. Write with a little AI help, schedule posts for when your audience is around, and let us handle the retries when something goes wrong.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3"><Link className={`${cta} px-7 py-3.5 text-base`} href="/register">Start free</Link><Link className={`${ghost} px-7 py-3.5 text-base`} href="/how-it-works">See how it works</Link></div>
        <div className="mt-6 flex flex-col items-center gap-3 text-xs text-neutral-500"><span>No credit card needed · Free plan included</span><span className="inline-flex items-center gap-3">Publish to <PlatformRow /></span></div>
        <Mockup />
      </div>
    </section>
    <Section eyebrow="Who it’s for" title="Built for the people actually doing the posting"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{WHO.map(([e, t, d], i) => (
      <div key={t} className={`rounded-3xl border border-stone-200 bg-white p-6 shadow-sm ${i % 2 ? 'sm:translate-y-3' : ''}`}><div className="mb-3 text-3xl">{e}</div><h3 className="font-serif text-xl font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-neutral-600">{d}</p></div>))}</div></Section>
    <Section eyebrow="Platforms" title="Where your posts can go" sub="Facebook Pages and Instagram work today. The rest are on the roadmap, and we’ll say so plainly."><PlatformList /></Section>
    <Section eyebrow="How it works" title="Four small steps, then you’re done"><Steps /></Section>
    <Section eyebrow="What you get" title="The useful stuff, without the clutter" sub="Built for creators, freelancers and small teams."><FeatureGrid /></Section>
    <Section eyebrow="Pricing" title="Simple pricing, in your currency" sub="Start free and upgrade only when you need more room."><PlanCards /></Section>
    <Section eyebrow="Questions" title="Things people usually ask"><Faq /></Section>
    <section className="mx-auto max-w-5xl px-6 pt-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-neutral-900 px-8 py-14 text-center text-white shadow-2xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl" /><div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-violet-400/25 blur-3xl" />
        <h2 className="relative font-serif text-3xl font-bold sm:text-5xl">Give your Sundays back.</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-white/75">Plan the week’s posts once, check them over, and get on with your day.</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-7 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-amber-200"><Check size={16} />Start free</Link><Link href="/contact" className="inline-flex items-center rounded-xl border border-white/30 px-7 py-3.5 text-sm font-semibold transition hover:bg-white/10">Talk to us</Link></div>
      </div>
    </section>
  </>);
}
