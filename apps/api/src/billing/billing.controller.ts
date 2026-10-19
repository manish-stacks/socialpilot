import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from '../settings/settings.service';
import { MinRole, Public } from '../common/decorators';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { BillingService } from './billing.service';

@ApiTags('billing') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/billing')
export class BillingController {
  constructor(private svc: BillingService) {}
  @Get('plans') plans() { return this.svc.plans(); }
  @Get() overview(@Param('workspaceId') w: string) { return this.svc.overview(w); }
  @MinRole('ADMIN') @Post('checkout') checkout() { return this.svc.checkout(); }
}

/** Public pricing for the marketing site: live plan data from the database, nothing hard-coded. */
@ApiTags('public') @Controller('public/plans')
export class PublicPlansController {
  constructor(private svc: BillingService, private settings: SettingsService) {}
  @Public() @Get() async plans() {
    const plans = (await this.svc.plans()).map((p: any) => ({ code: p.code, name: p.name, priceCents: p.priceCents, aiCreditsPerMonth: p.aiCreditsPerMonth, maxAccounts: p.maxAccounts }));
    return { plans, inrPerUsd: Number(await this.settings.get<number>('usd_inr_rate')) || null };
  }
}
