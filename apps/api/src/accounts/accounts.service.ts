import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { metaConfigured } from '../integrations/meta/meta-oauth.service';
import { PLATFORMS, PLATFORM_RULES, PlatformCode } from '../common/platform-rules';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService, private billing: BillingService) {}

  async list(ws: string) {
    const rows = await this.prisma.socialAccount.findMany({
      where: { workspaceId: ws }, orderBy: { createdAt: 'asc' },
      select: { id: true, platform: true, displayName: true, status: true, tokenExpiresAt: true, createdAt: true },
    }); // credentials are never selected
    return rows.map((a) => ({ ...a, rules: PLATFORM_RULES[a.platform as PlatformCode] }));
  }

  /** OAuth connect flows land in Phase 5; this reports that honestly per platform. */
  providers() {
    return PLATFORMS.filter((p) => p !== 'MOCK' || process.env.ALLOW_MOCK_ACCOUNTS === 'true').map((platform) => {
      const meta = platform === 'FACEBOOK' || platform === 'INSTAGRAM';
      return {
        platform, oauthImplemented: meta, configured: meta ? metaConfigured() : false, mock: platform === 'MOCK',
        note: platform === 'MOCK' ? 'Development-only test account. Simulates publishing; never contacts any provider.'
          : meta ? (metaConfigured() ? 'Connect through Meta (Facebook Login).' : 'Not configured: set META_APP_ID, META_APP_SECRET, API_PUBLIC_URL, TOKEN_ENCRYPTION_KEY.')
          : 'Not implemented yet.',
      };
    });
  }

  async createMock(ws: string, name: string) {
    if (process.env.ALLOW_MOCK_ACCOUNTS !== 'true') throw new ForbiddenException('Mock accounts are disabled');
    const { plan } = await this.billing.planFor(ws);
    if ((await this.prisma.socialAccount.count({ where: { workspaceId: ws } })) >= plan.maxAccounts)
      throw new ConflictException(`Your ${plan.name} plan allows ${plan.maxAccounts} connected accounts`);
    return this.prisma.socialAccount.create({
      data: { workspaceId: ws, platform: 'MOCK', externalId: `mock-${Date.now()}`, displayName: name },
      select: { id: true, platform: true, displayName: true, status: true },
    });
  }

  async disconnect(ws: string, id: string) {
    const a = await this.prisma.socialAccount.findFirst({ where: { id, workspaceId: ws } });
    if (!a) throw new NotFoundException('Account not found');
    const used = await this.prisma.postTarget.count({ where: { socialAccountId: id } });
    if (used) throw new ConflictException(`This account is used by ${used} post target(s). Delete or cancel those posts first.`);
    await this.prisma.socialAccount.delete({ where: { id } });
  }
}
