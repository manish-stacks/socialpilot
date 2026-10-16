import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
const S = (n: number) => [IsOptional(), IsString(), MaxLength(n)];
function opt(n: number) { return (t: object, k: string) => S(n).forEach((d) => d(t, k)); }
export class GenerateDto {
  @IsIn(['ideas', 'variants', 'rewrite']) mode: 'ideas' | 'variants' | 'rewrite';
  @IsString() @MaxLength(2000) topic: string;
  @opt(200) brandName?: string;
  @opt(1000) brandDescription?: string;
  @opt(300) audience?: string;
  @opt(100) industry?: string;
  @opt(300) objective?: string;
  @opt(100) tone?: string;
  @opt(50) language?: string;
  @opt(100) postType?: string;
  @opt(300) cta?: string;
  @opt(300) hashtagPrefs?: string;
  @opt(500) mediaBrief?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsIn(['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'X'], { each: true }) platforms?: string[];
  /** rewrite mode */
  @opt(5000) text?: string;
  @IsOptional() @IsIn(['shorten', 'expand', 'change_tone', 'translate', 'improve']) instruction?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(8) count?: number;
}
