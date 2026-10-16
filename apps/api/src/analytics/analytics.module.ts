import { BadRequestException, Controller, Get, Injectable, Module, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { PrismaService } from '../prisma/prisma.service';

class RangeDto { @IsISO8601() from: string; @IsISO8601() to: string; }

/** Only publishing facts we own. Engagement/impressions need provider APIs (Phase 5) and are reported as unavailable. */
@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}
  async overview(ws: string, from: string, to: string) {
    const f = new Date(from), t = new Date(to);
    if (!(f < t) || t.getTime() - f.getTime() > 366 * 86_400_000) throw new BadRequestException('Invalid date range (max 366 days)');
    const targets = await this.prisma.postTarget.findMany({
      where: { post: { workspaceId: ws }, status: { in: ['PUBLISHED', 'FAILED'] }, OR: [{ publishedAt: { gte: f, lt: t } }, { publishedAt: null, post: { scheduledAt: { gte: f, lt: t } } }] },
      select: { status: true, publishedAt: true, socialAccount: { select: { platform: true } }, post: { select: { scheduledAt: true } } },
    });
    const day: Record<string, { date: string; published: number; failed: number }> = {};
    const plat: Record<string, { platform: string; published: number; failed: number }> = {};
    for (const x of targets as any[]) {
      const d = (x.publishedAt ?? x.post.scheduledAt).toISOString().slice(0, 10);
      const ok = x.status === 'PUBLISHED';
      const a = (day[d] ??= { date: d, published: 0, failed: 0 });
      const b = (plat[x.socialAccount.platform] ??= { platform: x.socialAccount.platform, published: 0, failed: 0 });
      ok ? (a.published++, b.published++) : (a.failed++, b.failed++);
    }
    const published = targets.filter((x: any) => x.status === 'PUBLISHED').length;
    return {
      range: { from, to },
      totals: { published, failed: targets.length - published },
      successRate: targets.length ? published / targets.length : null,
      byDay: Object.values(day).sort((a, b) => a.date.localeCompare(b.date)),
      byPlatform: Object.values(plat),
      engagement: { available: false, reason: 'Provider analytics are not connected yet (requires Phase 5 integrations).' },
    };
  }
}
@ApiTags('analytics') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}
  @Get('overview') overview(@Param('workspaceId') w: string, @Query() q: RangeDto) { return this.svc.overview(w, q.from, q.to); }
}
@Module({ controllers: [AnalyticsController], providers: [AnalyticsService] })
export class AnalyticsModule {}
