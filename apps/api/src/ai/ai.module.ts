import { Body, Controller, Get, HttpCode, Module, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser, MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { AiService } from './ai.service';
import { GenerateDto } from './ai.dto';

@ApiTags('ai') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/ai')
export class AiController {
  constructor(private svc: AiService) {}
  @MinRole('EDITOR') @Throttle({ default: { limit: 20, ttl: 60_000 } }) @Post('generate') @HttpCode(200)
  generate(@Param('workspaceId') w: string, @CurrentUser() u: AuthUser, @Body() d: GenerateDto) { return this.svc.generate(w, u.id, d); }
  @Get('generations') history(@Param('workspaceId') w: string) { return this.svc.history(w); }
}
@Module({ controllers: [AiController], providers: [AiService] })
export class AiModule {}
