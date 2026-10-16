import { facebookAdapter, instagramAdapter } from './adapters';
import { NotReadyError } from '../../publishing/errors';

type Call = { url: string; method: string; body: URLSearchParams };
let calls: Call[]; let responder: (c: Call) => any;
beforeEach(() => {
  calls = []; process.env.IG_POLL_MS = '1'; process.env.META_GRAPH_VERSION = 'v26.0';
  (global as any).fetch = jest.fn(async (url: string, init: any = {}) => {
    const u = new URL(url); const body = new URLSearchParams(init.body ?? u.searchParams.toString());
    const c = { url: u.origin + u.pathname, method: init.method ?? 'GET', body }; calls.push(c);
    return { ok: true, status: 200, text: async () => JSON.stringify(responder(c)) };
  });
});
const hooks = () => ({ saveContainer: jest.fn(async () => {}), markSending: jest.fn(async () => {}) });
const input = (platform: 'fb' | 'ig', media: any[] = [], target: any = {}) => ({
  account: { externalId: platform === 'fb' ? 'PAGE1' : 'IG1', credentials: { accessToken: 'TOK' } },
  target: { id: 't', containerId: null, sendingAt: null, ...target }, text: 'Hello #x', media, hooks: hooks(),
});
const img = (n = 1) => Array.from({ length: n }, (_, i) => ({ url: `https://m/${i}.jpg`, mimeType: 'image/jpeg' }));

describe('facebook adapter', () => {
  it('text post -> POST /{page}/feed with message and page token', async () => {
    responder = () => ({ id: 'PAGE1_9' });
    const i = input('fb'); const r = await facebookAdapter.publish(i as any);
    expect(r.externalId).toBe('PAGE1_9');
    expect(calls[0]).toMatchObject({ url: 'https://graph.facebook.com/v26.0/PAGE1/feed', method: 'POST' });
    expect(calls[0].body.get('message')).toBe('Hello #x'); expect(calls[0].body.get('access_token')).toBe('TOK');
    expect(i.hooks.markSending).toHaveBeenCalledTimes(1);
  });
  it('single photo -> /photos with url + caption, returns post_id', async () => {
    responder = () => ({ id: 'photo1', post_id: 'PAGE1_5' });
    const r = await facebookAdapter.publish(input('fb', img()) as any);
    expect(r.externalId).toBe('PAGE1_5'); expect(calls[0].url).toMatch(/PAGE1\/photos$/);
    expect(calls[0].body.get('url')).toBe('https://m/0.jpg'); expect(calls[0].body.get('caption')).toBe('Hello #x');
  });
  it('multiple photos -> unpublished uploads, then one feed post attaching them; send marker only before the feed call', async () => {
    let n = 0; responder = (c) => (c.url.endsWith('/photos') ? { id: `ph${++n}` } : { id: 'PAGE1_7' });
    const i = input('fb', img(2)); const r = await facebookAdapter.publish(i as any);
    expect(r.externalId).toBe('PAGE1_7'); expect(calls.map((c) => c.url.split('/').pop())).toEqual(['photos', 'photos', 'feed']);
    expect(calls[0].body.get('published')).toBe('false'); expect(calls[2].body.get('attached_media[1]')).toBe('{"media_fbid":"ph2"}');
    expect(i.hooks.markSending).toHaveBeenCalledTimes(1);
  });
  it('rejects mixed photo/video', async () => {
    await expect(facebookAdapter.publish(input('fb', [...img(), { url: 'v', mimeType: 'video/mp4' }]) as any)).rejects.toThrow();
  });
  it('reconcile finds a matching recent post', async () => {
    responder = () => ({ data: [{ id: 'old', message: 'other', created_time: new Date().toISOString() }, { id: 'PAGE1_1', message: 'Hello #x', created_time: new Date().toISOString() }] });
    expect(await facebookAdapter.reconcile!(input('fb', [], { sendingAt: new Date(Date.now() - 1000) }) as any)).toBe('PAGE1_1');
  });
});

describe('instagram adapter', () => {
  const flow = (statusSeq: string[]) => { let s = 0; responder = (c) => {
    if (c.url.endsWith('content_publishing_limit')) return { data: [{ quota_usage: 1, config: { quota_total: 100 } }] };
    if (c.url.endsWith('/IG1/media') && c.method === 'POST') return { id: 'CONT1' };
    if (c.url.endsWith('/CONT1')) return { status_code: statusSeq[Math.min(s++, statusSeq.length - 1)] };
    if (c.url.endsWith('media_publish')) return { id: 'MEDIA9' };
    return {};
  }; };
  it('image: create container -> FINISHED -> media_publish(creation_id); container saved before publish', async () => {
    flow(['FINISHED']); const i = input('ig', img()); const r = await instagramAdapter.publish(i as any);
    expect(r.externalId).toBe('MEDIA9');
    const create = calls.find((c) => c.url.endsWith('/IG1/media'))!; expect(create.body.get('image_url')).toBe('https://m/0.jpg'); expect(create.body.get('caption')).toBe('Hello #x');
    const pub = calls.find((c) => c.url.endsWith('media_publish'))!; expect(pub.body.get('creation_id')).toBe('CONT1');
    expect(i.hooks.saveContainer).toHaveBeenCalledWith('CONT1');
  });
  it('video -> REELS container', async () => {
    flow(['FINISHED']); await instagramAdapter.publish(input('ig', [{ url: 'https://m/v.mp4', mimeType: 'video/mp4' }]) as any);
    const create = calls.find((c) => c.url.endsWith('/IG1/media'))!; expect(create.body.get('media_type')).toBe('REELS'); expect(create.body.get('video_url')).toBe('https://m/v.mp4');
  });
  it('carousel: child containers (is_carousel_item) then CAROUSEL parent with children', async () => {
    flow(['FINISHED']); await instagramAdapter.publish(input('ig', img(3)) as any);
    const creates = calls.filter((c) => c.url.endsWith('/IG1/media'));
    expect(creates).toHaveLength(4); expect(creates[0].body.get('is_carousel_item')).toBe('true');
    expect(creates[3].body.get('media_type')).toBe('CAROUSEL'); expect(creates[3].body.get('children')).toBe('CONT1,CONT1,CONT1');
  });
  it('still processing -> NotReadyError, nothing published', async () => {
    flow(['IN_PROGRESS']); await expect(instagramAdapter.publish(input('ig', img()) as any)).rejects.toBeInstanceOf(NotReadyError);
    expect(calls.some((c) => c.url.endsWith('media_publish'))).toBe(false);
  });
  it('resuming with a container already PUBLISHED does not publish again', async () => {
    flow(['PUBLISHED']); const r = await instagramAdapter.publish(input('ig', img(), { containerId: 'CONT1' }) as any);
    expect(r.externalId).toBeNull(); expect(calls.some((c) => c.url.endsWith('media_publish') || c.url.endsWith('/IG1/media'))).toBe(false);
  });
  it('requires media', async () => { await expect(instagramAdapter.publish(input('ig') as any)).rejects.toThrow(/requires/); });
  it('an ERROR container is a permanent failure', async () => {
    flow(['ERROR']); await expect(instagramAdapter.publish(input('ig', img()) as any)).rejects.toThrow(/could not process|failed/i);
  });
});
