import { Controller, Get, Module, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}
  @Get() overview(@Param('workspaceId') w: string) { return this.svc.overview(w); }
}
@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
