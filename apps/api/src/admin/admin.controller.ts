import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser } from '../common/decorators';
import { SettingsService } from '../settings/settings.service';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminOpsService } from './admin-ops.service';
import { AdminRetryDto, AuditQuery, DaysQuery, FailedQuery, PageQuery, PlanCreateDto, PlanUpdateDto, ReasonDto, SettingDto, UsersQuery } from './admin.dto';

/** Every route here requires a verified server-side ADMIN role (AdminGuard). Hiding links in the UI is cosmetic only. */
@ApiTags('admin') @ApiBearerAuth() @UseGuards(AdminGuard) @Throttle({ default: { limit: 120, ttl: 60_000 } }) @Controller('admin')
export class AdminController {
  constructor(private svc: AdminService, private ops: AdminOpsService, private settings: SettingsService) {}
  @Get('me') me(@CurrentUser() u: AuthUser) { return { id: u.id, email: u.email, systemRole: u.systemRole }; }
  @Get('overview') overview(@Query() q: DaysQuery) { return this.svc.overview(q.days); }

  @Get('users') users(@Query() q: UsersQuery) { return this.svc.users(q); }
  @Get('users/:id') user(@Param('id') id: string) { return this.svc.userDetail(id); }
  @Post('users/:id/suspend') @HttpCode(200) suspend(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() d: ReasonDto) { return this.svc.setUserStatus(a.id, id, 'SUSPENDED', d.reason); }
  @Post('users/:id/reactivate') @HttpCode(200) reactivate(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() d: ReasonDto) { return this.svc.setUserStatus(a.id, id, 'ACTIVE', d.reason); }

  @Get('workspaces') workspaces(@Query() q: PageQuery) { return this.svc.workspaces(q); }
  @Get('workspaces/:id') workspace(@Param('id') id: string) { return this.svc.workspaceDetail(id); }
  @Post('workspaces/:id/suspend') @HttpCode(200) wsSuspend(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() d: ReasonDto) { return this.svc.setWorkspaceSuspended(a.id, id, true, d.reason); }
  @Post('workspaces/:id/reactivate') @HttpCode(200) wsReactivate(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() d: ReasonDto) { return this.svc.setWorkspaceSuspended(a.id, id, false, d.reason); }

  @Get('plans') plans() { return this.svc.plans(); }
  @Post('plans') createPlan(@CurrentUser() a: AuthUser, @Body() d: PlanCreateDto) { return this.svc.createPlan(a.id, d); }
  @Patch('plans/:id') updatePlan(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() d: PlanUpdateDto) { return this.svc.updatePlan(a.id, id, d); }
  @Get('subscriptions') subscriptions(@Query() q: PageQuery) { return this.svc.subscriptions(q); }

  @Get('usage') usage(@Query() q: DaysQuery) { return this.svc.usage(q.days); }
  @Get('audit') audit(@Query() q: AuditQuery) { return this.svc.audit(q); }

  @Get('publishing') publishing() { return this.ops.publishing(); }
  @Get('publishing/failed') failed(@Query() q: FailedQuery) { return this.ops.failed(q); }
  @Post('publishing/targets/:id/retry') @HttpCode(200) retry(@CurrentUser() a: AuthUser, @Param('id') id: string, @Body() d: AdminRetryDto) { return this.ops.retry(a.id, id, !!d.confirmDuplicateRisk); }
  @Get('integrations') integrations() { return this.ops.integrations(); }

  @Get('settings') getSettings() { return this.settings.all(); }
  @Put('settings/:key') setSetting(@CurrentUser() a: AuthUser, @Param('key') key: string, @Body() d: SettingDto) { return this.settings.set(key, d.value, a.id); }
}
