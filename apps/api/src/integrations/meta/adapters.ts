import { graph } from './meta.client';
import { NotReadyError, PermanentError, RetryableError } from '../../publishing/errors';

export interface MediaRef { url: string; mimeType: string }
export interface PublishInput {
  account: { externalId: string; credentials: { accessToken: string; pageId?: string } };
  target: { id: string; containerId: string | null; sendingAt: Date | null };
  text: string; media: MediaRef[];
  hooks: { saveContainer(id: string): Promise<void>; markSending(): Promise<void> };
}
export interface PublishResult { externalId: string | null }
export interface Adapter {
  /** true when re-running publish() after an unknown outcome cannot create a duplicate. */
  retrySafe: boolean;
  publish(i: PublishInput): Promise<PublishResult>;
  /** Look for a post that may already exist after an unknown outcome. Returns its id, or null if none found. */
  reconcile?(i: PublishInput): Promise<string | null>;
}
const isImg = (m: MediaRef) => m.mimeType.startsWith('image/');
const isVid = (m: MediaRef) => m.mimeType.startsWith('video/');

/** Facebook Page: /{page-id}/feed, /photos, /videos with a Page access token (pages_manage_posts). No idempotency key exists. */
export const facebookAdapter: Adapter = {
  retrySafe: false,
  async publish(i) {
    const page = i.account.externalId, token = i.account.credentials.accessToken;
    const imgs = i.media.filter(isImg), vids = i.media.filter(isVid);
    if (vids.length && imgs.length) throw new PermanentError('A Facebook post cannot mix photos and video');
    if (vids.length > 1) throw new PermanentError('Facebook video posts support one video');
    if (!i.media.length) {
      await i.hooks.markSending();
      const r = await graph<{ id: string }>(`${page}/feed`, { method: 'POST', token, params: { message: i.text } });
      return { externalId: r.id };
    }
    if (vids.length) {
      await i.hooks.markSending();
      const r = await graph<{ id: string }>(`${page}/videos`, { method: 'POST', token, timeoutMs: 120_000, params: { file_url: vids[0].url, description: i.text } });
      return { externalId: r.id };
    }
    if (imgs.length === 1) {
      await i.hooks.markSending();
      const r = await graph<{ id: string; post_id?: string }>(`${page}/photos`, { method: 'POST', token, params: { url: imgs[0].url, caption: i.text, published: true } });
      return { externalId: r.post_id ?? r.id };
    }
    // Several photos: upload unpublished (invisible, safe to repeat), then one feed post attaching them.
    const ids: string[] = [];
    for (const m of imgs) ids.push((await graph<{ id: string }>(`${page}/photos`, { method: 'POST', token, params: { url: m.url, published: false } })).id);
    await i.hooks.markSending();
    const params: Record<string, string> = { message: i.text };
    ids.forEach((id, n) => { params[`attached_media[${n}]`] = JSON.stringify({ media_fbid: id }); });
    const r = await graph<{ id: string }>(`${page}/feed`, { method: 'POST', token, params });
    return { externalId: r.id };
  },
  async reconcile(i) {
    const since = i.target.sendingAt ? i.target.sendingAt.getTime() - 120_000 : 0;
    const r = await graph<{ data: { id: string; message?: string; created_time: string }[] }>(`${i.account.externalId}/feed`, {
      token: i.account.credentials.accessToken, params: { fields: 'id,message,created_time', limit: 10 },
    });
    const hit = r.data?.find((p) => new Date(p.created_time).getTime() >= since && (p.message ?? '').trim() === i.text.trim());
    return hit?.id ?? null;
  },
};

/**
 * Instagram API with Facebook Login (Page-linked professional accounts):
 * POST /{ig-user-id}/media -> poll status_code -> POST /{ig-user-id}/media_publish. Supports image, Reel (one video), image carousel.
 * A container can be published only once, so retrying with a saved container id cannot duplicate the post.
 */
export const instagramAdapter: Adapter = {
  retrySafe: true,
  async publish(i) {
    const ig = i.account.externalId, token = i.account.credentials.accessToken;
    const imgs = i.media.filter(isImg), vids = i.media.filter(isVid);
    if (!i.media.length) throw new PermanentError('Instagram requires an image or video');
    if (vids.length && imgs.length) throw new PermanentError('Mixed image/video carousels are not supported here');
    if (vids.length > 1) throw new PermanentError('Instagram video posts (Reels) support one video');
    if (imgs.length > 10) throw new PermanentError('Instagram carousels support at most 10 images');

    let container = i.target.containerId;
    if (container) {
      const st = await graph<{ status_code?: string; status?: string }>(container, { token, params: { fields: 'status_code,status' } });
      if (st.status_code === 'PUBLISHED') return { externalId: null }; // earlier attempt did publish; Meta does not return the media id here
      if (st.status_code === 'EXPIRED') container = null; // containers expire; create a fresh one
      if (st.status_code === 'ERROR') throw new PermanentError(`Instagram could not process the media${st.status ? `: ${st.status}` : ''}`);
    }
    if (!container) {
      await quotaCheck(ig, token);
      if (vids.length) container = (await graph<{ id: string }>(`${ig}/media`, { method: 'POST', token, params: { media_type: 'REELS', video_url: vids[0].url, caption: i.text } })).id;
      else if (imgs.length === 1) container = (await graph<{ id: string }>(`${ig}/media`, { method: 'POST', token, params: { image_url: imgs[0].url, caption: i.text } })).id;
      else {
        const kids: string[] = [];
        for (const m of imgs) kids.push((await graph<{ id: string }>(`${ig}/media`, { method: 'POST', token, params: { image_url: m.url, is_carousel_item: true } })).id);
        container = (await graph<{ id: string }>(`${ig}/media`, { method: 'POST', token, params: { media_type: 'CAROUSEL', children: kids.join(','), caption: i.text } })).id;
      }
      await i.hooks.saveContainer(container);
    }
    // Short poll; long video processing is handed back to the queue instead of blocking a worker slot.
    for (let n = 0; n < 4; n++) {
      const st = await graph<{ status_code?: string; status?: string }>(container, { token, params: { fields: 'status_code,status' } });
      if (st.status_code === 'FINISHED') {
        await i.hooks.markSending();
        const r = await graph<{ id: string }>(`${ig}/media_publish`, { method: 'POST', token, params: { creation_id: container } });
        return { externalId: r.id };
      }
      if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new PermanentError(`Instagram media processing failed (${st.status_code})${st.status ? `: ${st.status}` : ''}`);
      if (st.status_code === 'PUBLISHED') return { externalId: null };
      await new Promise((r) => setTimeout(r, Number(process.env.IG_POLL_MS ?? 2000)));
    }
    throw new NotReadyError('Instagram is still processing the media');
  },
};

/** Best effort: honours the account's publishing quota if Meta reports one. Failures here never block publishing. */
async function quotaCheck(ig: string, token: string) {
  try {
    const r = await graph<{ data?: { quota_usage: number; config?: { quota_total: number } }[] }>(`${ig}/content_publishing_limit`, { token, params: { fields: 'quota_usage,config' } });
    const q = r.data?.[0];
    if (q?.config && q.quota_usage >= q.config.quota_total) throw new RetryableError('Instagram publishing quota reached for now', 60 * 60_000);
  } catch (e) { if (e instanceof RetryableError) throw e; }
}

/** Development-only adapter for MOCK accounts. Never contacts any provider. Text markers drive test scenarios. */
export const mockAdapter: Adapter = {
  retrySafe: true,
  async publish(i) {
    if (i.text.includes('[fail]')) throw new PermanentError('Mock permanent failure requested by [fail] marker');
    if (i.text.includes('[flaky]') && !i.target.containerId) { await i.hooks.saveContainer('mock-seen'); throw new RetryableError('Mock transient failure requested by [flaky] marker'); }
    return { externalId: `mock_${i.target.id}` };
  },
};
export const ADAPTERS = (): Record<string, Adapter> => ({ FACEBOOK: facebookAdapter, INSTAGRAM: instagramAdapter, ...(process.env.ALLOW_MOCK_ACCOUNTS === 'true' ? { MOCK: mockAdapter } : {}) });
