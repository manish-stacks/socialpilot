import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthUser, CurrentUser, Public } from '../common/decorators';

const COOKIE = 'sp_refresh';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  private out(res: Response, r: { user: unknown; accessToken: string; refreshToken: string; maxAgeMs: number }) {
    res.cookie(COOKIE, r.refreshToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/v1/auth', maxAge: r.maxAgeMs });
    return { user: r.user, accessToken: r.accessToken };
  }

  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.out(res, await this.auth.register(dto, req.headers['user-agent']));
  }
  @Public() @Throttle({ default: { limit: 10, ttl: 60_000 } }) @HttpCode(200) @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.out(res, await this.auth.login(dto, req.headers['user-agent']));
  }
  @Public() @HttpCode(200) @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.out(res, await this.auth.refresh(req.cookies?.[COOKIE], req.headers['user-agent']));
  }
  @Public() @HttpCode(204) @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { path: '/api/v1/auth' });
  }
  @Get('me') me(@CurrentUser() u: AuthUser) { return this.auth.me(u.id); }
}
