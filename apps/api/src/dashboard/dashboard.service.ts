import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private billing: BillingService) {}
  async overview(ws: string) {
    const grouped = await this.prisma.post.groupBy({ by: ['status'], where: { workspaceId: ws }, _count: { _all: true } });
    const count = (s: string) => grouped.find((g: any) => g.status === s)?._count._all ?? 0;
    const [accounts, upcoming, recent, targets, accountRows, aiRecent, plan] = await Promise.all([
      this.prisma.socialAccount.count({ where: { workspaceId: ws } }),
      this.prisma.post.findMany({ where: { workspaceId: ws, status: 'SCHEDULED', scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take: 5, select: { id: true, caption: true, scheduledAt: true } }),
      this.prisma.post.findMany({ where: { workspaceId: ws }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, caption: true, status: true, updatedAt: true } }),
      this.prisma.postTarget.groupBy({ by: ['socialAccountId'], where: { post: { workspaceId: ws } }, _count: { _all: true } }),
      this.prisma.socialAccount.findMany({ where: { workspaceId: ws }, select: { id: true, platform: true } }),
      this.prisma.aIGeneration.findMany({ where: { workspaceId: ws }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, mode: true, prompt: true, createdAt: true } }),
      this.billing.overview(ws),
    ]);
    const byPlatform: Record<string, number> = {};
    for (const t of targets as any[]) {
      const p = accountRows.find((a: any) => a.id === t.socialAccountId)?.platform;
      if (p) byPlatform[p] = (byPlatform[p] ?? 0) + t._count._all;
    }
    return {
      counts: { accounts, published: count('PUBLISHED') + count('PARTIALLY_PUBLISHED'), scheduled: count('SCHEDULED'), drafts: count('DRAFT'), failed: count('FAILED') },
      upcoming, recent, aiRecent, usage: plan.usage, plan: plan.plan.name,
      platformDistribution: Object.entries(byPlatform).map(([platform, targets]) => ({ platform, targets })),
    };
  }
}
