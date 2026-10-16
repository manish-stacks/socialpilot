import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}
export class UsersQuery extends PageQuery { @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED']) status?: string; }
export class DaysQuery { @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) days?: number; }
export class AuditQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(40) actorId?: string;
  @IsOptional() @IsString() @MaxLength(60) action?: string;
  @IsOptional() @IsString() @MaxLength(40) workspaceId?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}
export class FailedQuery extends PageQuery { @IsOptional() @IsIn(['FAILED', 'UNCERTAIN']) status?: string; }
export class ReasonDto { @IsString() @MinLength(3) @MaxLength(300) reason: string; }
export class PlanCreateDto {
  @IsString() @Matches(/^[a-z0-9_-]{2,30}$/) code: string;
  @IsString() @MinLength(2) @MaxLength(60) name: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(10_000_000) priceCents: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) aiCreditsPerMonth: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(10_000) maxAccounts: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class PlanUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000_000) priceCents?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000) aiCreditsPerMonth?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10_000) maxAccounts?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class SettingDto { @IsDefined() value: unknown; }
export class AdminRetryDto { @IsOptional() @IsBoolean() confirmDuplicateRisk?: boolean; }
