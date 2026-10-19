export type PlatformKey = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'x';
/** Simple self-drawn glyphs in the spirit of each platform's mark (no external assets). */
export function PlatformIcon({ k, size = 20 }: { k: PlatformKey; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true as const };
  switch (k) {
    case 'facebook': return <svg {...p}><path d="M13.6 21.5v-8h2.7l.5-3.2h-3.2V8.3c0-.9.4-1.7 1.8-1.7h1.5V3.8c-.3 0-1.3-.2-2.5-.2-2.6 0-4.3 1.6-4.3 4.4v2.3H7.4v3.2h2.7v8z" /></svg>;
    case 'instagram': return <svg {...p} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" /></svg>;
    case 'linkedin': return <svg {...p}><rect x="3.6" y="9" width="3.6" height="11.4" rx=".6" /><circle cx="5.4" cy="5.2" r="2.1" /><path d="M10 9h3.4v1.6c.6-1.1 1.9-1.9 3.6-1.9 3.3 0 4 2.1 4 5v6.7h-3.6v-5.9c0-1.4-.2-2.6-1.8-2.6s-2.1 1.1-2.1 2.6v5.9H10z" /></svg>;
    case 'tiktok': return <svg {...p}><path d="M16.2 3c.3 2.4 1.7 4 4 4.2v3.2c-1.4 0-2.8-.4-4-1.2v6.1c0 3.4-2.6 5.9-5.8 5.9S4.6 18.7 4.6 15.5c0-3.3 2.8-6 6.4-5.7v3.3c-1.7-.3-3.1.8-3.1 2.4 0 1.4 1.1 2.6 2.6 2.6 1.6 0 2.8-1.2 2.8-3V3z" /></svg>;
    case 'youtube': return <svg {...p}><path fillRule="evenodd" d="M7.5 4.5h9A5.5 5.5 0 0 1 22 10v4a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 14v-4a5.5 5.5 0 0 1 5.5-5.5zM10 9v6l5.2-3z" /></svg>;
    case 'x': return <svg {...p} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 4.5 19 19.5M19 4.5 5 19.5" /></svg>;
  }
}
export const BRAND: Record<PlatformKey, string> = { facebook: 'bg-[#1877f2]', instagram: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]', linkedin: 'bg-[#0a66c2]', tiktok: 'bg-black', youtube: 'bg-[#ff0000]', x: 'bg-black' };
export function PlatformBadge({ k, size = 40, className = '' }: { k: PlatformKey; size?: number; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${BRAND[k]} ${className}`} style={{ width: size, height: size }}><PlatformIcon k={k} size={Math.round(size * 0.52)} /></span>;
}
