import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.module';
import { composeText, PLATFORM_RULES, PlatformCode, validateMediaForPlatform } from '../common/platform-rules';
import { canTransition, isDeletable, isEditable, PostStatusCode } from './post-state';
import { ListPostsDto, PostBodyDto } from './posts.dto';

const INCLUDE = {
  targets: { include: { socialAccount: { select: { id: true, platform: true, displayName: true } } } },
  media: { include: { mediaAsset: { select: { id: true, filename: true, mimeType: true } } }, orderBy: { position: 'asc' as const } },
};

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService, private queue: QueueService) {}

  private ref = (t: any, scheduledAt: Date | null) => ({ ...t, post: { scheduledAt } });
  private async enqueueAll(p: any) { for (const t of p.targets) await this.queue.enqueueTarget(this.ref(t, p.scheduledAt)); }
  private async dequeueAll(p: any) { for (const t of p.targets) await this.queue.removeTarget(this.ref(t, p.scheduledAt)); }

  private async refs(ws: string, dto: PostBodyDto) {
    const ids = [...new Set((dto.targets ?? []).map((t) => t.accountId))];
    if (ids.length !== (dto.targets ?? []).length) throw new BadRequestException('Duplicate target account');
    if (ids.length && (await this.prisma.socialAccount.count({ where: { id: { in: ids }, workspaceId: ws } })) !== ids.length)
      throw new BadRequestException('Unknown social account');
    const m = [...new Set(dto.mediaIds ?? [])];
    if (m.length && (await this.prisma.mediaAsset.count({ where: { id: { in: m }, workspaceId: ws, status: 'READY' } })) !== m.length)
      throw new BadRequestException('Unknown or unfinished media asset');
  }

  /** Throws a 400 listing every reason the post can't be scheduled. */
  private assertSchedulable(post: { caption: string; hashtags: unknown; cta: string | null; targets: any[]; media: any[] }, at: Date) {
    const errs: string[] = [];
    if (!(at.getTime() > Date.now())) errs.push('Scheduled time must be in the future');
    if (!post.targets.length) errs.push('Select at least one account');
    for (const t of post.targets) {
      const p = t.socialAccount.platform as PlatformCode;
      const label = `${p} (${t.socialAccount.displayName})`;
      if (t.socialAccount.status !== 'ACTIVE') errs.push(`${label}: account needs reconnecting`);
      const text = composeText(t.captionOverride ?? post.caption, (post.hashtags as string[]) ?? [], post.cta);
      if (!text) errs.push(`${label}: caption is empty`);
      if (text.length > PLATFORM_RULES[p].maxCaption) errs.push(`${label}: ${text.length}/${PLATFORM_RULES[p].maxCaption} characters`);
      if (PLATFORM_RULES[p].requiresMedia && !post.media.length) errs.push(`${label}: requires an image or video`);
      for (const m of validateMediaForPlatform(p, post.media.map((x: any) => x.mediaAsset?.mimeType ?? ''))) errs.push(m);
    }
    if (errs.length) throw new BadRequestException(errs);
  }

  async create(ws: string, userId: string, dto: PostBodyDto) {
    await this.refs(ws, dto);
    return this.prisma.post.create({
      data: {
        workspaceId: ws, createdById: userId, caption: dto.caption, hashtags: dto.hashtags ?? [], cta: dto.cta,
        targets: { create: (dto.targets ?? []).map((t) => ({ socialAccountId: t.accountId, captionOverride: t.captionOverride || null })) },
        media: { create: (dto.mediaIds ?? []).map((id, position) => ({ mediaAssetId: id, position })) },
      },
      include: INCLUDE,
    });
  }

  async get(ws: string, id: string) {
    const p = await this.prisma.post.findFirst({ where: { id, workspaceId: ws }, include: INCLUDE });
    if (!p) throw new NotFoundException('Post not found');
    return p;
  }

  async update(ws: string, id: string, dto: PostBodyDto) {
    const cur = await this.get(ws, id);
    if (!isEditable(cur.status as PostStatusCode)) throw new ConflictException(`A ${cur.status.toLowerCase()} post can't be edited`);
    await this.refs(ws, dto);
    if (cur.status === 'SCHEDULED') await this.dequeueAll(cur);
    const saved = await this.prisma.$transaction(async (tx) => {
      // Only targets no worker can have touched may be replaced; otherwise a post being published could be re-created and sent twice.
      const total = await tx.postTarget.count({ where: { postId: id } });
      const del = await tx.postTarget.deleteMany({ where: { postId: id, status: { in: ['PENDING', 'QUEUED', 'CANCELLED'] }, claimedAt: null } });
      if (del.count !== total) throw new ConflictException('Publishing has started for this post; it can no longer be edited');
      await tx.postMedia.deleteMany({ where: { postId: id } });
      const next = await tx.post.update({
        where: { id },
        data: {
          caption: dto.caption, hashtags: dto.hashtags ?? [], cta: dto.cta ?? null,
          targets: { create: (dto.targets ?? []).map((t) => ({ socialAccountId: t.accountId, captionOverride: t.captionOverride || null })) },
          media: { create: (dto.mediaIds ?? []).map((m, position) => ({ mediaAssetId: m, position })) },
        },
        include: INCLUDE,
      });
      if (next.status === 'SCHEDULED') this.assertSchedulable(next, next.scheduledAt!); // throws -> rolls back
      return next;
    }).catch(async (e) => { if (cur.status === 'SCHEDULED') await this.enqueueAll(cur); throw e; });
    if (saved.status === 'SCHEDULED') await this.enqueueAll(saved);
    return saved;
  }

  async schedule(ws: string, id: string, iso: string) {
    const cur = await this.get(ws, id);
    if (!canTransition(cur.status as PostStatusCode, 'SCHEDULED')) throw new ConflictException(`Can't schedule a ${cur.status.toLowerCase()} post`);
    const at = new Date(iso);
    this.assertSchedulable(cur, at);
    if (cur.status === 'SCHEDULED') await this.dequeueAll(cur);
    const next = await this.prisma.$transaction(async (tx) => {
      await tx.postTarget.updateMany({ where: { postId: id }, data: { generation: { increment: 1 }, status: 'PENDING', errorMessage: null, attempts: 0, polls: 0, nextAttemptAt: null, claimedAt: null } });
      return tx.post.update({ where: { id }, data: { status: 'SCHEDULED', scheduledAt: at }, include: INCLUDE });
    });
    await this.enqueueAll(next); // if Redis is down this returns quietly; the worker's reconciler enqueues from MySQL
    return next;
  }

  async cancel(ws: string, id: string) {
    const cur = await this.get(ws, id);
    if (!canTransition(cur.status as PostStatusCode, 'CANCELLED')) throw new ConflictException(`Can't cancel a ${cur.status.toLowerCase()} post`);
    await this.dequeueAll(cur);
    // Guarded flip: if a worker already moved the post to PUBLISHING this matches 0 rows and we refuse.
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.post.updateMany({ where: { id, status: 'SCHEDULED' }, data: { status: 'CANCELLED' } });
      if (r.count !== 1) throw new ConflictException('Publishing has already started; it can no longer be cancelled');
      await tx.postTarget.updateMany({ where: { postId: id, status: { in: ['PENDING', 'QUEUED'] } }, data: { status: 'CANCELLED' } });
      return tx.post.findUniqueOrThrow({ where: { id }, include: INCLUDE });
    });
  }

  async remove(ws: string, id: string) {
    const cur = await this.get(ws, id);
    if (!isDeletable(cur.status as PostStatusCode)) throw new ConflictException('Only drafts and cancelled posts can be deleted');
    await this.prisma.post.delete({ where: { id } });
  }

  async list(ws: string, q: ListPostsDto) {
    const page = q.page ?? 1, pageSize = q.pageSize ?? 20;
    const where: any = { workspaceId: ws };
    if (q.status && q.status !== 'ALL') where.status = q.status;
    if (q.q) where.caption = { contains: q.q };
    if (q.from || q.to) where.scheduledAt = { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lt: new Date(q.to) }) };
    if (q.platform) where.targets = { some: { socialAccount: { platform: q.platform } } };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({ where, include: INCLUDE, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Manual retry. UNCERTAIN targets may already be live on the provider, so they need explicit confirmation. */
  async retryTarget(ws: string, userId: string, postId: string, targetId: string, confirmDuplicateRisk: boolean) {
    const post = await this.get(ws, postId);
    const t = post.targets.find((x: any) => x.id === targetId);
    if (!t) throw new NotFoundException('Target not found');
    if (t.status !== 'FAILED' && t.status !== 'UNCERTAIN') throw new ConflictException(`A ${t.status.toLowerCase()} target can't be retried`);
    if (t.status === 'UNCERTAIN' && !confirmDuplicateRisk) throw new ConflictException('This post may already be live. Confirm that you accept the risk of a duplicate.');
    if ((await this.prisma.socialAccount.findUnique({ where: { id: t.socialAccount.id }, select: { status: true } }))?.status !== 'ACTIVE') throw new ConflictException('Reconnect the account before retrying');
    const next = await this.prisma.$transaction(async (tx) => {
      // Confirmed uncertain retry: clear the SENDING marker so the worker sends instead of reconciling again.
      await tx.postTarget.update({ where: { id: targetId }, data: { generation: { increment: 1 }, status: 'QUEUED', attempts: 0, polls: 0, errorMessage: null, nextAttemptAt: null, claimedAt: null, ...(t.status === 'UNCERTAIN' ? { stage: null } : {}) } });
      await tx.post.updateMany({ where: { id: postId, status: { in: ['FAILED', 'PARTIALLY_PUBLISHED'] } }, data: { status: 'PUBLISHING' } });
      await tx.auditLog.create({ data: { actorId: userId, workspaceId: ws, action: 'post.target_retry', targetType: 'post_target', targetId, metadata: { from: t.status, confirmedDuplicateRisk: confirmDuplicateRisk } } });
      return tx.post.findUniqueOrThrow({ where: { id: postId }, include: INCLUDE });
    });
    await this.enqueueAll({ ...next, targets: next.targets.filter((x: any) => x.id === targetId) });
    return next;
  }

  async attempts(ws: string, postId: string, targetId: string) {
    await this.get(ws, postId);
    return this.prisma.publishingAttempt.findMany({ where: { targetId, target: { postId } }, orderBy: { attemptNo: 'desc' }, take: 50 });
  }
}
