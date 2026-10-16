import { Body, Controller, Get, Module, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';
import type { Response } from 'express';
import { AuthUser, CurrentUser, MinRole, Public } from '../../common/decorators';
import { WorkspaceGuard } from '../../workspaces/workspace.guard';
import { MetaOAuthService } from './meta-oauth.service';

class ConnectDto { @IsString() stateId: string; @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) selections: string[]; }

@ApiTags('meta') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/accounts/meta')
export class MetaController {
  constructor(private svc: MetaOAuthService) {}
  @MinRole('ADMIN') @Post('start') start(@Param('workspaceId') w: string, @CurrentUser() u: AuthUser) { return this.svc.start(w, u.id); }
  @MinRole('ADMIN') @Get('pending/:stateId') pending(@Param('workspaceId') w: string, @CurrentUser() u: AuthUser, @Param('stateId') s: string) { return this.svc.pending(w, u.id, s); }
  @MinRole('ADMIN') @Post('connect') connect(@Param('workspaceId') w: string, @CurrentUser() u: AuthUser, @Body() d: ConnectDto) { return this.svc.connect(w, u.id, d.stateId, d.selections); }
  @MinRole('EDITOR') @Post(':accountId/revalidate') revalidate(@Param('workspaceId') w: string, @Param('accountId') a: string) { return this.svc.revalidate(w, a); }
}

/** Browser redirect target registered in the Meta app. Public by necessity; protected by the single-use, expiring, hashed `state`. */
@Controller('oauth/meta')
export class MetaCallbackController {
  constructor(private svc: MetaOAuthService) {}
  @Public() @Get('callback')
  async callback(@Query() q: { code?: string; state?: string; error?: string }, @Res() res: Response) {
    const r = await this.svc.callback(q);
    const web = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const p = new URLSearchParams();
    if (r.workspaceId) p.set('ws', r.workspaceId);
    if (r.stateId) p.set('pending', r.stateId);
    if (r.error) p.set('error', r.error);
    res.redirect(`${web}/accounts/meta?${p}`);
  }
}
@Module({ controllers: [MetaController, MetaCallbackController], providers: [MetaOAuthService], exports: [MetaOAuthService] })
export class MetaModule {}
