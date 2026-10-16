import { randomBytes } from 'crypto';
import { PublishingService } from './publishing.service';
import { aggregatePostStatus, backoffMs } from './policy';
import { jobKey } from '../queue/queue.module';
import { encryptJson } from '../common/secrets';
import { MetaError, MetaNetworkError } from '../integrations/meta/meta.client';
import { PermanentError, RetryableError } from './errors';

beforeAll(() => { process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64'); process.env.PUBLISH_MAX_ATTEMPTS = '3'; });

const target = (o: any = {}) => ({
  id: 't1', postId: 'p1', socialAccountId: 'acc', status: 'QUEUED', attempts: 0, polls: 0, stage: null, containerId: null, sendingAt: null, nextAttemptAt: null, captionOverride: null,
  socialAccount: { platform: 'FACEBOOK', status: 'ACTIVE', externalId: '123', encryptedCredentials: encryptJson({ accessToken: 'tok' }) },
  post: { status: 'SCHEDULED', scheduledAt: new Date(Date.now() - 1000), caption: 'hi', hashtags: [], cta: null, media: [] }, ...o,
});
function mk(t: any, adapter: any, claim = 1) {
  const prisma: any = {
    postTarget: { findUnique: jest.fn().mockResolvedValue(t), updateMany: jest.fn().mockResolvedValue({ count: claim }), findMany: jest.fn().mockResolvedValue([{ status: 'PUBLISHED' }]),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ ...t, ...data, post: t.post })) },
    post: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    publishingAttempt: { create: jest.fn().mockResolvedValue({ id: 'a1' }), update: jest.fn() },
    socialAccount: { update: jest.fn() },
    $transaction: (fn: any) => fn(prisma),
  };
  const queue: any = { enqueueTarget: jest.fn().mockResolvedValue(true) };
  const svc = new PublishingService(prisma, queue, { signedGetUrl: async () => 'https://x/y' } as any);
  svc.adapters = { FACEBOOK: adapter, INSTAGRAM: adapter };
  return { svc, prisma, queue };
}
const lastTargetUpdate = (p: any) => p.postTarget.update.mock.calls.at(-1)[0].data;

describe('PublishingService.process', () => {
  it('publishes and records the external id', async () => {
    const a = { retrySafe: false, publish: jest.fn().mockResolvedValue({ externalId: 'fb_1' }) };
    const { svc, prisma } = mk(target(), a);
    expect(await svc.process('t1')).toBe('published');
    expect(lastTargetUpdate(prisma)).toMatchObject({ status: 'PUBLISHED', externalPostId: 'fb_1' });
    expect(prisma.publishingAttempt.update.mock.calls[0][0].data.outcome).toBe('SUCCESS');
  });
  it('does nothing when another worker holds the claim (duplicate prevention)', async () => {
    const a = { retrySafe: false, publish: jest.fn() };
    const { svc } = mk(target(), a, 0);
    expect(await svc.process('t1')).toBe('skipped');
    expect(a.publish).not.toHaveBeenCalled();
  });
  it('skips cancelled posts and finished targets', async () => {
    const a = { retrySafe: false, publish: jest.fn() };
    expect(await mk(target({ post: { ...target().post, status: 'CANCELLED' } }), a).svc.process('t1')).toBe('skipped');
    expect(await mk(target({ status: 'PUBLISHED' }), a).svc.process('t1')).toBe('skipped');
    expect(a.publish).not.toHaveBeenCalled();
  });
  it('re-queues instead of publishing early', async () => {
    const a = { retrySafe: false, publish: jest.fn() };
    const { svc, queue } = mk(target({ post: { ...target().post, scheduledAt: new Date(Date.now() + 3_600_000) } }), a);
    expect(await svc.process('t1')).toBe('requeued'); expect(queue.enqueueTarget).toHaveBeenCalled(); expect(a.publish).not.toHaveBeenCalled();
  });
  it('retries transient errors with backoff and re-enqueues', async () => {
    const a = { retrySafe: false, publish: jest.fn().mockRejectedValue(new RetryableError('blip')) };
    const { svc, prisma, queue } = mk(target(), a);
    expect(await svc.process('t1')).toBe('retry');
    const d = lastTargetUpdate(prisma);
    expect(d).toMatchObject({ status: 'QUEUED', attempts: 1 }); expect(d.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(queue.enqueueTarget).toHaveBeenCalled();
  });
  it('gives up after the max attempts', async () => {
    const a = { retrySafe: false, publish: jest.fn().mockRejectedValue(new RetryableError('blip')) };
    const { svc, prisma } = mk(target({ attempts: 2 }), a);
    expect(await svc.process('t1')).toBe('failed'); expect(lastTargetUpdate(prisma).status).toBe('FAILED');
  });
  it('marks the account expired on an auth error and does not retry', async () => {
    const a = { retrySafe: false, publish: jest.fn().mockRejectedValue(new MetaError(401, 'Error validating access token', 190)) };
    const { svc, prisma, queue } = mk(target(), a);
    expect(await svc.process('t1')).toBe('failed');
    expect(prisma.socialAccount.update).toHaveBeenCalledWith({ where: { id: 'acc' }, data: { status: 'EXPIRED' } });
    expect(queue.enqueueTarget).not.toHaveBeenCalled();
  });
  it('permanent errors fail immediately', async () => {
    const a = { retrySafe: false, publish: jest.fn().mockRejectedValue(new PermanentError('bad media')) };
    const { svc } = mk(target(), a);
    expect(await svc.process('t1')).toBe('failed');
  });
  it('a network timeout AFTER the send step is UNCERTAIN, never auto-retried', async () => {
    const a = { retrySafe: false, publish: jest.fn().mockImplementation(async (i: any) => { await i.hooks.markSending(); throw new MetaNetworkError('timeout', 't'); }) };
    const { svc, prisma, queue } = mk(target(), a);
    expect(await svc.process('t1')).toBe('uncertain'); expect(lastTargetUpdate(prisma).status).toBe('UNCERTAIN'); expect(queue.enqueueTarget).not.toHaveBeenCalled();
  });
  it('a network timeout BEFORE sending is safe to retry', async () => {
    const a = { retrySafe: false, publish: jest.fn().mockRejectedValue(new MetaNetworkError('network', 'down')) };
    expect(await mk(target(), a).svc.process('t1')).toBe('retry');
  });
  it('after a lost result, reconciles instead of re-sending', async () => {
    const a = { retrySafe: false, publish: jest.fn(), reconcile: jest.fn().mockResolvedValue('fb_existing') };
    const { svc, prisma } = mk(target({ stage: 'SENDING', sendingAt: new Date() }), a);
    expect(await svc.process('t1')).toBe('published'); expect(a.publish).not.toHaveBeenCalled();
    expect(lastTargetUpdate(prisma)).toMatchObject({ status: 'PUBLISHED', externalPostId: 'fb_existing' });
  });
  it('if nothing matches after a lost result, goes UNCERTAIN and does not re-send', async () => {
    const a = { retrySafe: false, publish: jest.fn(), reconcile: jest.fn().mockResolvedValue(null) };
    const { svc } = mk(target({ stage: 'SENDING', sendingAt: new Date() }), a);
    expect(await svc.process('t1')).toBe('uncertain'); expect(a.publish).not.toHaveBeenCalled();
  });
  it('idempotent providers (Instagram containers) may safely re-run after a lost result', async () => {
    const a = { retrySafe: true, publish: jest.fn().mockResolvedValue({ externalId: 'ig_1' }) };
    const { svc } = mk(target({ stage: 'SENDING', containerId: 'c1' }), a);
    expect(await svc.process('t1')).toBe('published'); expect(a.publish).toHaveBeenCalled();
  });
  it('processing media is re-polled without consuming a retry attempt', async () => {
    const { NotReadyError } = await import('./errors');
    const a = { retrySafe: true, publish: jest.fn().mockRejectedValue(new NotReadyError('processing')) };
    const { svc, prisma } = mk(target(), a);
    expect(await svc.process('t1')).toBe('processing'); expect(lastTargetUpdate(prisma)).toMatchObject({ status: 'PROCESSING', polls: 1 });
    expect(lastTargetUpdate(prisma).attempts).toBeUndefined();
  });
});
describe('policy', () => {
  it('aggregates post status from targets', () => {
    expect(aggregatePostStatus(['PUBLISHED', 'QUEUED'])).toBe('PUBLISHING');
    expect(aggregatePostStatus(['PUBLISHED', 'FAILED'])).toBe('PARTIALLY_PUBLISHED');
    expect(aggregatePostStatus(['PUBLISHED', 'UNCERTAIN'])).toBe('PARTIALLY_PUBLISHED');
    expect(aggregatePostStatus(['PUBLISHED', 'PUBLISHED'])).toBe('PUBLISHED');
    expect(aggregatePostStatus(['FAILED'])).toBe('FAILED');
    expect(aggregatePostStatus(['CANCELLED'])).toBe('CANCELLED');
  });
  it('backoff doubles and is capped', () => {
    expect(backoffMs(1, 0)).toBe(30_000); expect(backoffMs(2, 0)).toBe(60_000); expect(backoffMs(20, 0)).toBe(30 * 60_000);
  });
  it('job keys are deterministic per target state', () => {
    const t = { id: 'x', attempts: 1, polls: 0, post: { scheduledAt: new Date(5) } };
    expect(jobKey(t)).toBe(jobKey({ ...t })); expect(jobKey(t)).not.toBe(jobKey({ ...t, attempts: 2 }));
  });
});
