import { Body, Controller, Delete, Get, HttpCode, Module, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthUser, CurrentUser, MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../workspaces/workspace.guard';
import { MediaService } from './media.service';

class UploadDto {
  @IsString() @MaxLength(200) filename: string;
  @IsString() @MaxLength(100) mimeType: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(600 * 1024 * 1024) sizeBytes: number;
}
@ApiTags('media') @ApiBearerAuth() @UseGuards(WorkspaceGuard) @Controller('workspaces/:workspaceId/media')
export class MediaController {
  constructor(private svc: MediaService) {}
  @Get() list(@Param('workspaceId') w: string, @Query('q') q?: string, @Query('type') t?: string) { return this.svc.list(w, q, t); }
  @MinRole('EDITOR') @Post('upload-url') @HttpCode(200)
  upload(@Param('workspaceId') w: string, @CurrentUser() u: AuthUser, @Body() d: UploadDto) { return this.svc.requestUpload(w, u.id, d.filename, d.mimeType, d.sizeBytes); }
  @MinRole('EDITOR') @Post(':id/confirm') @HttpCode(200) confirm(@Param('workspaceId') w: string, @Param('id') id: string) { return this.svc.confirm(w, id); }
  @MinRole('EDITOR') @Delete(':id') @HttpCode(204) remove(@Param('workspaceId') w: string, @Param('id') id: string) { return this.svc.remove(w, id); }
}
@Module({ controllers: [MediaController], providers: [MediaService] })
export class MediaModule {}
