import { IsEmail, IsString, MaxLength, MinLength, Matches } from 'class-validator';
export class RegisterDto {
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsString() @MinLength(10) @MaxLength(128)
  @Matches(/[a-zA-Z]/, { message: 'password needs a letter' }) @Matches(/\d/, { message: 'password needs a digit' })
  password: string;
}
export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MaxLength(128) password: string;
}
