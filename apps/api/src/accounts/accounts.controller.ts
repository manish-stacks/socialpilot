import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { AccountsService } from './accounts.service';

class MockDto { @IsString() @MinLength(2) @MaxLength(60) name: string; }
@ApiTags('accounts') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/accounts')
export class AccountsController {
  constructor(private svc: AccountsService) {}
  @Get() list(@Param('workspaceId') w: string) { return this.svc.list(w); }
  @Get('providers') providers() { return this.svc.providers(); }
  @MinRole('ADMIN') @Post('mock') createMock(@Param('workspaceId') w: string, @Body() d: MockDto) { return this.svc.createMock(w, d.name); }
  @MinRole('ADMIN') @Delete(':id') @HttpCode(204) remove(@Param('workspaceId') w: string, @Param('id') id: string) { return this.svc.disconnect(w, id); }
}
