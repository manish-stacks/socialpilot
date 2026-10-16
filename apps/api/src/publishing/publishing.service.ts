import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.module';
import { MediaService } from '../media/media.service';
import { composeText } from '../common/platform-rules';
import { decryptJson } from '../common/secrets';
import { ADAPTERS, Adapter } from '../integrations/meta/adapters';
import { classifyMeta, sanitize } from '../integrations/meta/meta.client';
import { NotReadyError, PermanentError, RetryableError, UncertainError } from './errors';
import { aggregatePostStatus, backoffMs, MAX_POLLS, maxAttempts, STALE_CLAIM_MS } from './policy';

export type Outcome = 'skipped' | 'requeued' | 'published' | 'retry' | 'processing' | 'failed' | 'uncertain';
const CLAIMABLE = ['PENDING', 'QUEUED', 'PROCESSING'];

@Injectable()
export class PublishingService {
  private log = new Logger('Publishing');
  adapters: Record<string, Adapter> = ADAPTERS();
  readonly workerId = `${process.pid}-${randomBytes(3).toString('hex')}`;
  constructor(private prisma: PrismaService, private queue: QueueService, private media: MediaService) {}

  async process(targetId: string): Promise<Outcome> {
    const db = this.prisma;
    const t = await db.postTarget.findUnique({
      where: { id: targetId },
      include: { post: { include: { workspace: { select: { suspendedAt: true } }, media: { include: { mediaAsset: true }, orderBy: { position: 'asc' } } } }, socialAccount: true },
    });
    if (!t || !CLAIMABLE.includes(t.status) || !['SCHEDULED', 'PUBLISHING'].includes(t.post.status)) return 'skipped';
    if (t.post.workspace?.suspendedAt) return 'skipped'; // suspended workspaces don't publish
    if ((t.nextAttemptAt ?? t.post.scheduledAt ?? new Date(0)).getTime() > Date.now() + 1000) { await this.queue.enqueueTarget(t); return 'requeued'; }

    // Atomic claim: only one worker can move the target to PUBLISHING; a cancelled post can't be claimed.
    const claimed = await db.$transaction(async (tx: any) => {
      const r = await tx.postTarget.updateMany({
        where: { id: t.id, status: { in: CLAIMABLE }, OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } }], post: { status: { in: ['SCHEDULED', 'PUBLISHING'] } } },
        data: { status: 'PUBLISHING', claimedAt: new Date(), claimedBy: this.workerId },
      });
      if (r.count !== 1) return false;
      await tx.post.updateMany({ where: { id: t.postId, status: 'SCHEDULED' }, data: { status: 'PUBLISHING' } });
      return true;
    });
    if (!claimed) return 'skipped';

    const attemptNo = t.attempts + 1;
    const attempt = await db.publishingAttempt.create({ data: { targetId: t.id, attemptNo, startedAt: new Date() } });
    let sending = false;
    try {
      if (t.socialAccount.status !== 'ACTIVE') throw new PermanentError('Account needs to be reconnected');
      const adapter = this.adapters[t.socialAccount.platform];
      if (!adapter) throw new PermanentError(`Publishing to ${t.socialAccount.platform} is not implemented`);
      if (t.socialAccount.platform !== 'MOCK' && !t.socialAccount.encryptedCredentials) throw new PermanentError('Account has no stored credentials; reconnect it');
      const creds = t.socialAccount.platform === 'MOCK' ? { accessToken: 'mock' } : decryptJson<{ accessToken: string; pageId?: string }>(t.socialAccount.encryptedCredentials!);
      const input = {
        account: { externalId: t.socialAccount.externalId, credentials: creds },
        target: { id: t.id, containerId: t.containerId, sendingAt: t.sendingAt },
        text: composeText(t.captionOverride ?? t.post.caption, t.post.hashtags as string[], t.post.cta),
        media: await Promise.all(t.post.media.map(async (m: any) => ({ url: await this.media.signedGetUrl(m.mediaAsset.key, 3600), mimeType: m.mediaAsset.mimeType }))),
        hooks: {
          saveContainer: async (id: string) => { await db.postTarget.update({ where: { id: t.id }, data: { containerId: id } }); },
          markSending: async () => { sending = true; await db.postTarget.update({ where: { id: t.id }, data: { stage: 'SENDING', sendingAt: new Date() } }); },
        },
      };
      // A previous attempt reached the "send" step but never recorded a result. For providers without idempotency, look before re-sending.
      if (t.stage === 'SENDING' && !adapter.retrySafe) {
        const found = adapter.reconcile ? await adapter.reconcile(input) : null;
        if (found) return await this.finish(t, attempt.id, 'published', { status: 'PUBLISHED', externalPostId: found, publishedAt: new Date(), stage: null }, 'SUCCESS', 'Recovered: post already existed on the provider');
        throw new UncertainError('A previous attempt may have published this post but the result was lost, and no matching post was found. Check the account, then retry manually if it is not there.');
      }
      const res = await adapter.publish(input);
      return await this.finish(t, attempt.id, 'published', { status: 'PUBLISHED', externalPostId: res.externalId, publishedAt: new Date(), stage: null, errorMessage: null }, 'SUCCESS');
    } catch (e) {
      return await this.fail(t, attempt.id, e, sending, attemptNo);
    }
  }

  private async fail(t: any, attemptId: string, e: unknown, sending: boolean, attemptNo: number): Promise<Outcome> {
    let kind: string, message: string, code: string | undefined, http: number | undefined, minDelay = 0;
    const m = classifyMeta(e, sending); // only the publish call itself can leave an unknown outcome
    if (m) ({ kind, message, code, http } = m);
    else if (e instanceof NotReadyError) { kind = 'NOT_READY'; message = e.message; }
    else if (e instanceof RetryableError) { kind = 'RETRYABLE'; message = e.message; minDelay = e.minDelayMs; }
    else if (e instanceof UncertainError) { kind = 'UNCERTAIN'; message = e.message; }
    else if (e instanceof PermanentError) { kind = 'PERMANENT'; message = e.message; }
    else { kind = sending ? 'UNCERTAIN' : 'RETRYABLE'; message = sanitize((e as Error)?.message ?? 'Unexpected error'); this.log.error(`unexpected error on ${t.id}: ${message}`); }
    message = sanitize(message);
    const base = { claimedAt: null, claimedBy: null, errorMessage: message };

    if (kind === 'NOT_READY') {
      if (t.polls + 1 >= MAX_POLLS) return this.finish(t, attemptId, 'failed', { ...base, status: 'FAILED', polls: t.polls + 1 }, 'PERMANENT', 'Media processing did not finish in time', code, http);
      return this.finish(t, attemptId, 'processing', { claimedAt: null, claimedBy: null, status: 'PROCESSING', polls: t.polls + 1, errorMessage: null, nextAttemptAt: new Date(Date.now() + 30_000) }, 'PROCESSING', message, code, http, true);
    }
    if (kind === 'AUTH') {
      await this.prisma.socialAccount.update({ where: { id: t.socialAccountId }, data: { status: 'EXPIRED' } });
      return this.finish(t, attemptId, 'failed', { ...base, status: 'FAILED', errorMessage: 'Authorization expired or was revoked. Reconnect the account, then retry.' }, 'AUTH', message, code, http);
    }
    if (kind === 'RETRYABLE' || kind === 'RATE_LIMIT') {
      if (attemptNo >= maxAttempts()) return this.finish(t, attemptId, 'failed', { ...base, status: 'FAILED', attempts: attemptNo, errorMessage: `Gave up after ${attemptNo} attempts: ${message}` }, 'EXHAUSTED', message, code, http);
      const delay = Math.max(backoffMs(attemptNo), kind === 'RATE_LIMIT' ? 15 * 60_000 : 0, minDelay);
      return this.finish(t, attemptId, 'retry', { ...base, status: 'QUEUED', attempts: attemptNo, nextAttemptAt: new Date(Date.now() + delay) }, 'RETRYABLE', message, code, http, true);
    }
    if (kind === 'UNCERTAIN') return this.finish(t, attemptId, 'uncertain', { ...base, status: 'UNCERTAIN', attempts: attemptNo }, 'UNCERTAIN', message, code, http);
    return this.finish(t, attemptId, 'failed', { ...base, status: 'FAILED', attempts: attemptNo }, 'PERMANENT', message, code, http);
  }

  private async finish(t: any, attemptId: string, out: Outcome, data: any, outcome: string, message?: string, code?: string, http?: number, requeue = false): Promise<Outcome> {
    const db = this.prisma;
    const updated = await db.postTarget.update({ where: { id: t.id }, data: { claimedAt: null, claimedBy: null, ...data }, include: { post: true } });
    await db.publishingAttempt.update({ where: { id: attemptId }, data: { finishedAt: new Date(), outcome, providerCode: code, httpStatus: http, message: message ? sanitize(message) : null } });
    const all = await db.postTarget.findMany({ where: { postId: t.postId }, select: { status: true } });
    // Never overwrite a user-cancelled post.
    await db.post.updateMany({ where: { id: t.postId, status: { in: ['SCHEDULED', 'PUBLISHING', 'FAILED', 'PARTIALLY_PUBLISHED'] } }, data: { status: aggregatePostStatus(all.map((x: any) => x.status)) } });
    if (requeue) await this.queue.enqueueTarget(updated, true);
    return out;
  }
}
