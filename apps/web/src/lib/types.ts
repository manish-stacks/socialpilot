export type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE' | 'X' | 'MOCK';
export interface Account { id: string; platform: Platform; displayName: string; status: string; tokenExpiresAt: string | null; rules: { maxCaption: number; requiresMedia: boolean } }
export interface PostTarget { id: string; status: string; captionOverride: string | null; errorMessage: string | null; externalPostId: string | null; attempts: number; nextAttemptAt: string | null; socialAccount: { id: string; platform: Platform; displayName: string } }
export interface PostItem { id: string; caption: string; hashtags: string[]; cta: string | null; status: string; scheduledAt: string | null; createdAt: string; updatedAt: string; targets: PostTarget[]; media: { mediaAsset: { id: string; filename: string; mimeType: string } }[] }
export interface MediaItem { id: string; filename: string; mimeType: string; sizeBytes: number; createdAt: string; url: string }
export const wsPath = (id: string, p: string) => `/workspaces/${id}${p}`;
export interface Attempt { id: string; attemptNo: number; startedAt: string; outcome: string | null; providerCode: string | null; message: string | null }
