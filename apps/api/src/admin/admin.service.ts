import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQuery, PageQuery, PlanCreateDto, PlanUpdateDto, UsersQuery } from './admin.dto';
import { bucketByDay, paging, sinceDays } from './admin.util';

const USER_SAFE = { id: true, email: true, name: true, systemRole: true, status: true, emailVerifiedAt: true, createdAt: true } as const; // never passwordHash

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async overview(days = 30) {
    const db = this.prisma, since = sinceDays(days);
    const [users, active, suspended, newUsers, workspaces, suspendedWs, accounts, posts, targets, published, ai, subs, regs] = await Promise.all([
      db.user.count(), db.user.count({ where: { sessions: { some: { createdAt: { gte: since } } } } }), db.user.count({ where: { status: 'SUSPENDED' } }),
      db.user.count({ where: { createdAt: { gte: since } } }), db.workspace.count(), db.workspace.count({ where: { suspendedAt: { not: null } } }),
      db.socialAccount.groupBy({ by: ['platform', 'status'], _count: { _all: true } }),
      db.post.groupBy({ by: ['status'], _count: { _all: true } }), db.postTarget.groupBy({ by: ['status'], _count: { _all: true } }),
      db.postTarget.count({ where: { status: 'PUBLISHED', publishedAt: { gte: since } } }), db.aIGeneration.count({ where: { createdAt: { gte: since } } }),
      db.subscription.groupBy({ by: ['planId', 'status'], _count: { _all: true } }), db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 20000 }),
    ]);
    const plans = await db.plan.findMany({ select: { id: true, name: true } });
    const t = (s: string) => targets.find((x: any) => x.status === s)?._count._all ?? 0;
    const p = (s: string) => posts.find((x: any) => x.status === s)?._count._all ?? 0;
    return {
      rangeDays: days,
      users: { total: users, activeInRange: active, suspended, newInRange: newUsers, signupsByDay: bucketByDay(regs.map((r: any) => r.createdAt)) },
      workspaces: { total: workspaces, suspended: suspendedWs },
      accounts: { total: accounts.reduce((a: number, x: any) => a + x._count._all, 0), byPlatformStatus: accounts.map((x: any) => ({ platform: x.platform, status: x.status, count: x._count._all })) },
      posts: { scheduled: p('SCHEDULED'), publishing: p('PUBLISHING'), published: p('PUBLISHED') + p('PARTIALLY_PUBLISHED'), failed: p('FAILED'), drafts: p('DRAFT'), publishedTargetsInRange: published },
      publishing: { failedTargets: t('FAILED'), uncertainTargets: t('UNCERTAIN'), openTargets: t('PENDING') + t('QUEUED') + t('PUBLISHING') + t('PROCESSING') },
      ai: { generationsInRange: ai, estimatedCost: { available: false, reason: 'Token usage is not recorded, so cost cannot be estimated honestly.' } },
      subscriptions: { active: subs.filter((x: any) => x.status === 'active').reduce((a: number, x: any) => a + x._count._all, 0), byPlan: subs.map((x: any) => ({ plan: plans.find((pl: any) => pl.id === x.planId)?.name ?? x.planId, status: x.status, count: x._count._all })) },
      revenue: { available: false, reason: 'No verified billing data exists: no payment provider is connected and no payment events are recorded.' },
    };
  }

  // ---- users
  async users(q: UsersQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.q) where.OR = [{ email: { contains: q.q } }, { name: { contains: q.q } }];
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, select: { ...USER_SAFE, memberships: { select: { role: true, workspace: { select: { id: true, name: true, subscription: { select: { plan: { select: { name: true } } } } } } } } }, orderBy: { createdAt: 'desc' }, skip, take }),
    ]);
    return { total, page, pageSize, items: rows.map((u: any) => ({ ...u, memberships: undefined, workspaces: u.memberships.map((m: any) => ({ id: m.workspace.id, name: m.workspace.name, role: m.role, plan: m.workspace.subscription?.plan.name ?? 'Free' })) })) };
  }

  async userDetail(id: string) {
    const db = this.prisma;
    const u = await db.user.findUnique({ where: { id }, select: { ...USER_SAFE, memberships: { select: { role: true, workspace: { select: { id: true, name: true, suspendedAt: true } } } } } });
    if (!u) throw new NotFoundException('User not found');
    const [sessions, lastSession, ai30, posts, audit] = await Promise.all([
      db.session.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } }),
      db.session.findFirst({ where: { userId: id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      db.aIGeneration.count({ where: { userId: id, createdAt: { gte: sinceDays(30) } } }), db.post.count({ where: { createdById: id } }),
      db.auditLog.findMany({ where: { OR: [{ actorId: id }, { targetType: 'user', targetId: id }] }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, action: true, createdAt: true, metadata: true, workspaceId: true } }),
    ]);
    return { ...u, activeSessions: sessions, lastSignInAt: lastSession?.createdAt ?? null, usage: { aiGenerations30d: ai30, postsCreated: posts }, recentActivity: audit };
  }

  async setUserStatus(adminId: string, id: string, status: 'ACTIVE' | 'SUSPENDED', reason: string) {
    if (id === adminId) throw new BadRequestException('You cannot suspend your own account');
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, systemRole: true, status: true } });
    if (!u) throw new NotFoundException('User not found');
    if (u.systemRole === 'ADMIN') throw new ForbiddenException('Administrator accounts cannot be suspended here');
    if (u.status === status) throw new ConflictException(`User is already ${status.toLowerCase()}`);
    await this.prisma.$transaction(async (tx: any) => {
      await tx.user.update({ where: { id }, data: { status } });
      if (status === 'SUSPENDED') await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: adminId, action: status === 'SUSPENDED' ? 'admin.user.suspend' : 'admin.user.reactivate', targetType: 'user', targetId: id, metadata: { reason, email: u.email } } });
    });
    return { id, status };
  }

  // ---- workspaces
  async workspaces(q: PageQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const where: any = q.q ? { OR: [{ name: { contains: q.q } }, { slug: { contains: q.q } }] } : {};
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workspace.count({ where }),
      this.prisma.workspace.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: { id: true, name: true, slug: true, timezone: true, createdAt: true, suspendedAt: true, subscription: { select: { status: true, plan: { select: { name: true } } } }, _count: { select: { members: true, socialAccounts: true, posts: true } } } }),
    ]);
    return { total, page, pageSize, items: rows.map((w: any) => ({ ...w, plan: w.subscription?.plan.name ?? 'Free', subscriptionStatus: w.subscription?.status ?? 'free' })) };
  }

  async workspaceDetail(id: string) {
    const db = this.prisma;
    const w = await db.workspace.findUnique({ where: { id }, select: { id: true, name: true, slug: true, timezone: true, createdAt: true, suspendedAt: true, suspendedReason: true, subscription: { select: { status: true, currentPeriodEnd: true, plan: true } },
      members: { select: { role: true, user: { select: { id: true, email: true, name: true, status: true } } } },
      socialAccounts: { select: { id: true, platform: true, displayName: true, status: true, tokenExpiresAt: true } } } }); // no credentials selected
    if (!w) throw new NotFoundException('Workspace not found');
    const plan = w.subscription?.plan ?? (await db.plan.findUnique({ where: { code: 'free' } }));
    const [aiMonth, postGroups, audit] = await Promise.all([
      db.aIGeneration.count({ where: { workspaceId: id, createdAt: { gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)) } } }),
      db.post.groupBy({ by: ['status'], where: { workspaceId: id }, _count: { _all: true } }),
      db.auditLog.findMany({ where: { workspaceId: id }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, action: true, createdAt: true, actorId: true, metadata: true } }),
    ]);
    return { ...w, plan, usage: { aiUsed: aiMonth, aiLimit: plan?.aiCreditsPerMonth ?? null, accountsUsed: w.socialAccounts.length, accountsLimit: plan?.maxAccounts ?? null }, postsByStatus: postGroups.map((g: any) => ({ status: g.status, count: g._count._all })), recentActivity: audit,
      abuseReports: { available: false, reason: 'No abuse-reporting feature exists yet.' } };
  }

  async setWorkspaceSuspended(adminId: string, id: string, suspend: boolean, reason: string) {
    const w = await this.prisma.workspace.findUnique({ where: { id }, select: { id: true, name: true, suspendedAt: true } });
    if (!w) throw new NotFoundException('Workspace not found');
    if (!!w.suspendedAt === suspend) throw new ConflictException(`Workspace is already ${suspend ? 'suspended' : 'active'}`);
    await this.prisma.$transaction([
      this.prisma.workspace.update({ where: { id }, data: suspend ? { suspendedAt: new Date(), suspendedReason: reason } : { suspendedAt: null, suspendedReason: null } }),
      this.prisma.auditLog.create({ data: { actorId: adminId, workspaceId: id, action: suspend ? 'admin.workspace.suspend' : 'admin.workspace.reactivate', targetType: 'workspace', targetId: id, metadata: { reason, name: w.name } } }),
    ]);
    return { id, suspended: suspend };
  }

  // ---- plans & subscriptions
  async plans() {
    const [plans, subs] = await Promise.all([this.prisma.plan.findMany({ orderBy: { priceCents: 'asc' } }), this.prisma.subscription.groupBy({ by: ['planId'], _count: { _all: true } })]);
    return plans.map((p: any) => ({ ...p, subscriptions: subs.find((s: any) => s.planId === p.id)?._count._all ?? 0 }));
  }
  async createPlan(adminId: string, d: PlanCreateDto) {
    if (await this.prisma.plan.findUnique({ where: { code: d.code } })) throw new ConflictException('A plan with that code exists');
    const plan = await this.prisma.plan.create({ data: { ...d, active: d.active ?? true } });
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'admin.plan.create', targetType: 'plan', targetId: plan.id, metadata: { ...d } } });
    return plan;
  }
  async updatePlan(adminId: string, id: string, d: PlanUpdateDto) {
    const before = await this.prisma.plan.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Plan not found');
    if (before.code === 'free' && d.active === false) throw new BadRequestException('The free plan is the fallback for every workspace and cannot be deactivated');
    const after = await this.prisma.plan.update({ where: { id }, data: d });
    await this.prisma.auditLog.create({ data: { actorId: adminId, action: 'admin.plan.update', targetType: 'plan', targetId: id, metadata: { before: { name: before.name, priceCents: before.priceCents, aiCreditsPerMonth: before.aiCreditsPerMonth, maxAccounts: before.maxAccounts, active: before.active }, after: { ...d } } } });
    return after;
  }
  /** Read-only by design: subscription/payment state may only change through verified provider webhooks (Phase 7). */
  async subscriptions(q: PageQuery) {
    const { page, pageSize, skip, take } = paging(q);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.subscription.count(),
      this.prisma.subscription.findMany({ orderBy: { id: 'desc' }, skip, take, select: { id: true, status: true, currentPeriodEnd: true, provider: true, workspace: { select: { id: true, name: true } }, plan: { select: { name: true, priceCents: true } } } }),
    ]);
    return { total, page, pageSize, items: rows,
      webhooks: { configured: !!process.env.BILLING_PROVIDER, provider: process.env.BILLING_PROVIDER ?? null, eventsRecorded: 0, note: 'No payment webhook handler or PaymentEvent storage exists yet (Phase 7). Subscription records cannot be edited from the admin UI.' } };
  }

  // ---- usage
  async usage(days = 30) {
    const db = this.prisma, since = sinceDays(days);
    const [byWs, byMode, rows, perMin] = await Promise.all([
      db.aIGeneration.groupBy({ by: ['workspaceId'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { workspaceId: 'desc' } }, take: 20 }),
      db.aIGeneration.groupBy({ by: ['mode'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      db.aIGeneration.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 50000 }),
      db.aIGeneration.count({ where: { createdAt: { gte: new Date(Date.now() - 60_000) } } }),
    ]);
    const names = await db.workspace.findMany({ where: { id: { in: byWs.map((x: any) => x.workspaceId) } }, select: { id: true, name: true, subscription: { select: { plan: { select: { name: true, aiCreditsPerMonth: true } } } } } });
    return {
      rangeDays: days, generationsLastMinute: perMin,
      byWorkspace: byWs.map((x: any) => { const w = names.find((n: any) => n.id === x.workspaceId); return { workspaceId: x.workspaceId, name: w?.name ?? '(deleted)', plan: w?.subscription?.plan.name ?? 'Free', generations: x._count._all }; }),
      byMode: byMode.map((x: any) => ({ mode: x.mode, count: x._count._all })), byDay: bucketByDay(rows.map((r: any) => r.createdAt)),
      model: { name: process.env.GEMINI_MODEL ?? null, configured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL), note: 'Model and API key are server environment settings and cannot be changed or viewed here.' },
      estimatedCost: { available: false, reason: 'Token usage is not recorded.' },
    };
  }

  // ---- audit
  async audit(q: AuditQuery) {
    const { page, pageSize, skip, take } = paging({ ...q, pageSize: q.pageSize ?? 50 });
    const where: any = {};
    if (q.actorId) where.actorId = q.actorId;
    if (q.workspaceId) where.workspaceId = q.workspaceId;
    if (q.action) where.action = { startsWith: q.action };
    if (q.from || q.to) where.createdAt = { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lt: new Date(q.to) }) };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select: { id: true, action: true, targetType: true, targetId: true, workspaceId: true, metadata: true, createdAt: true, actor: { select: { id: true, email: true } } } }),
    ]);
    return { total, page, pageSize, items };
  }
}
