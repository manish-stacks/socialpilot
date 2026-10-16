import Link from 'next/link';
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold">{process.env.NEXT_PUBLIC_APP_NAME ?? 'SocialPilot AI'}</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">Plan, generate and publish social content from one workspace.</p>
      <div className="mt-8 flex justify-center gap-3"><Link className="btn" href="/register">Get started</Link><Link className="btn-ghost" href="/login">Log in</Link></div>
    </main>
  );
}
