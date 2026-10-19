import { PageHead, PlatformList, Section } from '@/components/marketing/site';
export const metadata = { title: 'Integrations' };
export default function P() { return (<><PageHead title="Integrations" sub="Official OAuth and documented APIs only." /><Section title=""><PlatformList />
  <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
    <div className="card"><h3 className="font-semibold">Facebook Pages</h3><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Text, photo, multi-photo and video posts to Pages you manage.</p></div>
    <div className="card"><h3 className="font-semibold">Instagram</h3><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Images, Reels and image carousels for professional accounts linked to a Facebook Page.</p></div></div>
  <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-neutral-500">Platform permissions, app review and rate limits vary and are controlled by each platform. A connected account is not a guarantee that publishing is permitted.</p></Section></>); }
