import { Injectable, NotImplementedException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Limits are editable data (admin UI comes in Phase 6). Prices are placeholders, not a commercial decision. */
const DEFAULT_PLANS = [
  { code: 'free', name: 'Free', priceCents: 0, aiCreditsPerMonth: 20, maxAccounts: 2 },
  { code: 'starter', name: 'Starter', priceCents: 1900, aiCreditsPerMonth: 200, maxAccounts: 5 },
  { code: 'pro', name: 'Pro', priceCents: 4900, aiCreditsPerMonth: 1000, maxAccounts: 15 },
  { code: 'agency', name: 'Agency', priceCents: 14900, aiCreditsPerMonth: 5000, maxAccounts: 50 },
];
export const monthStartUtc = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); };

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}
  async onModuleInit() {
    try { for (const p of DEFAULT_PLANS) await this.prisma.plan.upsert({ where: { code: p.code }, update: {}, create: p }); }
    catch (e) {
      if (process.env.NODE_ENV === 'production') throw e;
      console.error('[billing] Could not seed plans. Have you run `npm run db:migrate -- --name init`?'); // dev only: don't crash the API
    }
  }
  plans() { return this.prisma.plan.findMany({ where: { active: true }, orderBy: { priceCents: 'asc' } }); }

  async planFor(ws: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { workspaceId: ws }, include: { plan: true } });
    const plan = sub?.plan ?? (await this.prisma.plan.findUniqueOrThrow({ where: { code: 'free' } }));
    return { plan, sub };
  }

  async overview(ws: string) {
    const { plan, sub } = await this.planFor(ws);
    const [aiUsed, accountsUsed] = await Promise.all([
      this.prisma.aIGeneration.count({ where: { workspaceId: ws, createdAt: { gte: monthStartUtc() } } }),
      this.prisma.socialAccount.count({ where: { workspaceId: ws } }),
    ]);
    return {
      plan, status: sub?.status ?? 'free', currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      billingProviderConfigured: !!process.env.BILLING_PROVIDER,
      usage: { aiUsed, aiLimit: plan.aiCreditsPerMonth, accountsUsed, accountsLimit: plan.maxAccounts },
    };
  }
  checkout() {
    throw new NotImplementedException('No billing provider is configured. Payment flows and verified webhooks arrive in Phase 7.');
  }
}
