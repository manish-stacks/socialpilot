import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateWorkspaceDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}
export class UpdateWorkspaceDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}
export class InviteDto {
  @IsEmail() email: string;
  @IsIn(['ADMIN', 'EDITOR', 'VIEWER']) role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}
export class UpdateMemberDto { @IsIn(['ADMIN', 'EDITOR', 'VIEWER']) role: 'ADMIN' | 'EDITOR' | 'VIEWER'; }
export class AcceptDto { @IsString() @MinLength(10) token: string; }
