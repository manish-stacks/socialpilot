import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { BillingService } from './billing.service';

@ApiTags('billing') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/billing')
export class BillingController {
  constructor(private svc: BillingService) {}
  @Get('plans') plans() { return this.svc.plans(); }
  @Get() overview(@Param('workspaceId') w: string) { return this.svc.overview(w); }
  @MinRole('ADMIN') @Post('checkout') checkout() { return this.svc.checkout(); }
}
