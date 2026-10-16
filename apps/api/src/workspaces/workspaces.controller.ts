import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Membership, MinRole } from '../common/decorators';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceGuard } from './workspace.guard';
import { AcceptDto, CreateWorkspaceDto, InviteDto, UpdateMemberDto, UpdateWorkspaceDto } from './workspaces.dto';

@ApiTags('workspaces') @ApiBearerAuth() @Controller('workspaces')
export class WorkspacesController {
  constructor(private svc: WorkspacesService) {}
  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateWorkspaceDto) { return this.svc.create(u.id, dto); }
  @Get() list(@CurrentUser() u: AuthUser) { return this.svc.listForUser(u.id); }
  @Post('invitations/accept') @HttpCode(200)
  accept(@CurrentUser() u: AuthUser, @Body() dto: AcceptDto) { return this.svc.acceptInvite(u.id, u.email, dto.token); }

  @UseGuards(WorkspaceGuard) @Get(':workspaceId/members')
  members(@Param('workspaceId') id: string) { return this.svc.listMembers(id); }

  @UseGuards(WorkspaceGuard) @MinRole('ADMIN') @Patch(':workspaceId')
  update(@CurrentUser() u: AuthUser, @Param('workspaceId') id: string, @Body() dto: UpdateWorkspaceDto) { return this.svc.update(u.id, id, dto); }

  @UseGuards(WorkspaceGuard) @MinRole('ADMIN') @Post(':workspaceId/invitations')
  invite(@CurrentUser() u: AuthUser, @Membership() m: { role: any }, @Param('workspaceId') id: string, @Body() dto: InviteDto) {
    return this.svc.invite({ id: u.id, role: m.role }, id, dto);
  }
  @UseGuards(WorkspaceGuard) @MinRole('ADMIN') @Patch(':workspaceId/members/:memberId')
  role(@CurrentUser() u: AuthUser, @Membership() m: { role: any }, @Param('workspaceId') id: string, @Param('memberId') mid: string, @Body() dto: UpdateMemberDto) {
    return this.svc.updateMemberRole({ id: u.id, role: m.role }, id, mid, dto.role);
  }
  @UseGuards(WorkspaceGuard) @Delete(':workspaceId/members/:memberId') @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Membership() m: { role: any }, @Param('workspaceId') id: string, @Param('memberId') mid: string) {
    return this.svc.removeMember({ id: u.id, role: m.role }, id, mid);
  }
}
