import { IsBoolean, ArrayMaxSize, IsArray, IsISO8601, IsIn, IsOptional, IsString, MaxLength, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class TargetInput {
  @IsString() accountId: string;
  @IsOptional() @IsString() @MaxLength(10000) captionOverride?: string;
}
export class PostBodyDto {
  @IsString() @MaxLength(10000) caption: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(100, { each: true }) hashtags?: string[];
  @IsOptional() @IsString() @MaxLength(300) cta?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @Type(() => TargetInput) targets?: TargetInput[];
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) mediaIds?: string[];
}
export class ScheduleDto { @IsISO8601() scheduledAt: string; }
export class ListPostsDto {
  @IsOptional() @IsIn(['ALL', 'DRAFT', 'AWAITING_APPROVAL', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED', 'CANCELLED']) status?: string;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsIn(['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X', 'MOCK']) platform?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}
export class RetryDto { @IsOptional() @IsBoolean() confirmDuplicateRisk?: boolean; }
