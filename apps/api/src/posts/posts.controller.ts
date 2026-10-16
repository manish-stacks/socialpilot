import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { PostsService } from './posts.service';
import { ListPostsDto, PostBodyDto, RetryDto, ScheduleDto } from './posts.dto';

@ApiTags('posts') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/posts')
export class PostsController {
  constructor(private svc: PostsService) {}
  @Get() list(@Param('workspaceId') w: string, @Query() q: ListPostsDto) { return this.svc.list(w, q); }
  @Get(':id') get(@Param('workspaceId') w: string, @Param('id') id: string) { return this.svc.get(w, id); }
  @MinRole('EDITOR') @Post() create(@Param('workspaceId') w: string, @CurrentUser() u: AuthUser, @Body() d: PostBodyDto) { return this.svc.create(w, u.id, d); }
  @MinRole('EDITOR') @Patch(':id') update(@Param('workspaceId') w: string, @Param('id') id: string, @Body() d: PostBodyDto) { return this.svc.update(w, id, d); }
  @MinRole('EDITOR') @Post(':id/schedule') @HttpCode(200) schedule(@Param('workspaceId') w: string, @Param('id') id: string, @Body() d: ScheduleDto) { return this.svc.schedule(w, id, d.scheduledAt); }
  @MinRole('EDITOR') @Post(':id/cancel') @HttpCode(200) cancel(@Param('workspaceId') w: string, @Param('id') id: string) { return this.svc.cancel(w, id); }
  @MinRole('EDITOR') @Post(':id/targets/:targetId/retry') @HttpCode(200)
  retry(@Param('workspaceId') w: string, @CurrentUser() u: AuthUser, @Param('id') id: string, @Param('targetId') tid: string, @Body() d: RetryDto) { return this.svc.retryTarget(w, u.id, id, tid, !!d.confirmDuplicateRisk); }
  @Get(':id/targets/:targetId/attempts') attempts(@Param('workspaceId') w: string, @Param('id') id: string, @Param('targetId') tid: string) { return this.svc.attempts(w, id, tid); }
  @MinRole('EDITOR') @Delete(':id') @HttpCode(204) remove(@Param('workspaceId') w: string, @Param('id') id: string) { return this.svc.remove(w, id); }
}
