import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.module';
import { PostsService } from '../posts/posts.service';
import { metaConfigured } from '../integrations/meta/meta-oauth.service';
import { graphVersion } from '../integrations/meta/meta.client';
import { maxAttempts, STALE_CLAIM_MS } from '../publishing/policy';
import { FailedQuery } from './admin.dto';
import { paging, percentile, retryInfo, sinceDays } from './admin.util';

@Injectable()
export class AdminOpsService {
  constructor(private prisma: PrismaService, private queue: QueueService, private posts: PostsService) {}

  async publishing() {
    const db = this.prisma, now = new Date();
    const [byStatus, stale, overdue, scheduled24h, attempts, exhausted] = await Promise.all([
      db.postTarget.groupBy({ by: ['status'], _count: { _all: true } }),
      db.postTarget.count({ where: { status: 'PUBLISHING', claimedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) } } }),
      db.postTarget.count({ where: { status: { in: ['PENDING', 'QUEUED'] }, claimedAt: null, post: { status: 'SCHEDULED', scheduledAt: { lt: new Date(Date.now() - 2 * 60_000) } } } }),
      db.post.count({ where: { status: 'SCHEDULED', scheduledAt: { gte: now, lt: new Date(Date.now() + 86_400_000) } } }),
      db.publishingAttempt.findMany({ where: { startedAt: { gte: sinceDays(1) }, finishedAt: { not: null } }, select: { startedAt: true, finishedAt: true, outcome: true }, take: 5000 }),
      db.postTarget.count({ where: { status: 'FAILED', attempts: { gte: maxAttempts() } } }),
    ]);
    const ms = attempts.map((a: any) => a.finishedAt.getTime() - a.startedAt.getTime()).sort((a: number, b: number) => a - b);
    const outcomes: Record<string, number> = {}; for (const a of attempts as any[]) outcomes[a.outcome ?? 'unknown'] = (outcomes[a.outcome ?? 'unknown'] ?? 0) + 1;
    let queue: unknown;
    try { queue = { available: true, counts: await this.queue.stats() }; } catch (e: any) { queue = { available: false, reason: 'Redis/queue unreachable or not configured' }; }
    return {
      targetsByStatus: byStatus.map((x: any) => ({ status: x.status, count: x._count._all })),
      queue, health: { staleClaims: stale, overdueTargets: overdue, scheduledNext24h: scheduled24h, exhaustedTargets: exhausted,
        note: 'overdueTargets > 0 for several minutes usually means no worker is running or Redis is down.' },
      latencyMs24h: { attempts: ms.length, p50: percentile(ms, 50), p95: percentile(ms, 95), max: ms.length ? ms[ms.length - 1] : null }, attemptOutcomes24h: outcomes,
    };
  }

  async failed(q: FailedQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const where: any = { status: q.status ? q.status : { in: ['FAILED', 'UNCERTAIN'] } };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.postTarget.count({ where }),
      this.prisma.postTarget.findMany({ where, orderBy: { sendingAt: 'desc' }, skip, take, select: { id: true, status: true, attempts: true, errorMessage: true, stage: true, post: { select: { id: true, workspaceId: true, scheduledAt: true, workspace: { select: { name: true } } } },
        socialAccount: { select: { platform: true, displayName: true, status: true } }, attemptLog: { orderBy: { attemptNo: 'desc' }, take: 1, select: { providerCode: true, outcome: true, httpStatus: true, finishedAt: true } } } }),
    ]);
    const max = maxAttempts();
    return { total, page, pageSize, maxAttempts: max, items: rows.map((t: any) => ({ ...t, ...retryInfo(t, max), lastAttempt: t.attemptLog[0] ?? null, attemptLog: undefined })) };
  }

  /** Goes through the same safe path as user retries (account must be ACTIVE, uncertain needs confirmation, atomic state change). */
  async retry(adminId: string, targetId: string, confirm: boolean) {
    const t = await this.prisma.postTarget.findUnique({ where: { id: targetId }, select: { id: true, postId: true, post: { select: { workspaceId: true } } } });
    if (!t) throw new NotFoundException('Target not found');
    await this.posts.retryTarget(t.post.workspaceId, adminId, t.postId, targetId, confirm);
    await this.prisma.auditLog.create({ data: { actorId: adminId, workspaceId: t.post.workspaceId, action: 'admin.publishing_retry', targetType: 'post_target', targetId, metadata: { confirmedDuplicateRisk: confirm } } });
    return { queued: true };
  }

  /** Reports configuration presence only. Values (secrets) are never returned. */
  async integrations() {
    const db = this.prisma, set = (n: string) => !!process.env[n];
    const [accounts, attempts] = await Promise.all([
      db.socialAccount.groupBy({ by: ['platform', 'status'], _count: { _all: true } }),
      db.publishingAttempt.findMany({ where: { finishedAt: { gte: sinceDays(1) } }, select: { outcome: true, target: { select: { socialAccount: { select: { platform: true } } } } }, take: 5000 }),
    ]);
    const fails: Record<string, { ok: number; bad: number }> = {};
    for (const a of attempts as any[]) { const p = a.target.socialAccount.platform; const f = (fails[p] ??= { ok: 0, bad: 0 }); a.outcome === 'SUCCESS' ? f.ok++ : a.outcome === 'PROCESSING' ? 0 : f.bad++; }
    const envs = (...n: string[]) => n.map((name) => ({ name, set: set(name) }));
    const prov = (platform: string, implemented: boolean, configured: boolean, env: ReturnType<typeof envs>, note: string) => ({
      platform, implemented, configured, env, note,
      accounts: accounts.filter((a: any) => a.platform === platform).map((a: any) => ({ status: a.status, count: a._count._all })), last24h: fails[platform] ?? { ok: 0, bad: 0 } });
    const meta = envs('META_APP_ID', 'META_APP_SECRET', 'API_PUBLIC_URL', 'TOKEN_ENCRYPTION_KEY');
    const noteMeta = `Graph API ${graphVersion()}. Live publishing for non-team users requires Meta App Review and Business Verification.`;
    let redis = false; try { await Promise.race([this.queue.connection().ping(), new Promise((_, r) => setTimeout(r, 1500))]); redis = true; } catch { /* down */ }
    let mysql = false; try { await db.$queryRaw`SELECT 1`; mysql = true; } catch { /* down */ }
    return {
      providers: [
        prov('FACEBOOK', true, metaConfigured(), meta, noteMeta), prov('INSTAGRAM', true, metaConfigured(), meta, noteMeta),
        ...['LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X'].map((p) => prov(p, false, false, [], 'Not implemented yet.')),
      ],
      services: [
        { name: 'MySQL', ok: mysql }, { name: 'Redis / BullMQ', ok: redis, configured: set('REDIS_URL') },
        { name: 'Object storage (S3)', configured: set('S3_BUCKET') && set('S3_ACCESS_KEY_ID') && set('S3_SECRET_ACCESS_KEY') },
        { name: 'Gemini', configured: set('GEMINI_API_KEY') && set('GEMINI_MODEL'), detail: process.env.GEMINI_MODEL ?? null },
        { name: 'Token encryption key', configured: Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? '', 'base64').length === 32 },
        { name: 'Billing provider', configured: set('BILLING_PROVIDER') }, { name: 'Dev mock accounts', configured: process.env.ALLOW_MOCK_ACCOUNTS === 'true', detail: 'should be off in production' },
      ],
    };
  }
}
