export type PlatformCode = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE' | 'X' | 'MOCK';
export const PLATFORMS: PlatformCode[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X', 'MOCK'];
/** Character limits are working values; re-verify against each provider's current docs in Phase 5. */
export const PLATFORM_RULES: Record<PlatformCode, { maxCaption: number; requiresMedia: boolean }> = {
  INSTAGRAM: { maxCaption: 2200, requiresMedia: true },
  FACEBOOK: { maxCaption: 63206, requiresMedia: false },
  LINKEDIN: { maxCaption: 3000, requiresMedia: false },
  TIKTOK: { maxCaption: 2200, requiresMedia: true },
  YOUTUBE: { maxCaption: 5000, requiresMedia: true },
  X: { maxCaption: 280, requiresMedia: false },
  MOCK: { maxCaption: 500, requiresMedia: false },
};
export function composeText(caption: string, hashtags: string[], cta?: string | null): string {
  const tags = hashtags.map((h) => '#' + h.replace(/^#/, '')).join(' ');
  return [caption.trim(), cta?.trim(), tags].filter(Boolean).join('\n\n');
}

/** Structural media rules (counts/mixing). Format and size details are checked by the provider and surfaced as errors. */
export function validateMediaForPlatform(p: PlatformCode, mimes: string[]): string[] {
  const img = mimes.filter((m) => m.startsWith('image/')).length, vid = mimes.filter((m) => m.startsWith('video/')).length, errs: string[] = [];
  if (p === 'INSTAGRAM') {
    if (img && vid) errs.push('Instagram: choose either images or one video, not both');
    if (vid > 1) errs.push('Instagram: only one video (Reel) per post');
    if (img > 10) errs.push('Instagram: at most 10 images in a carousel');
  }
  if (p === 'FACEBOOK') {
    if (img && vid) errs.push('Facebook: choose either photos or one video, not both');
    if (vid > 1) errs.push('Facebook: only one video per post');
  }
  return errs;
}
