import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from '@node-rs/argon2';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, sha256 } from '../common/crypto';
import { SettingsService } from '../settings/settings.service';
import { LoginDto, RegisterDto } from './auth.dto';

const DAY = 86_400_000;
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private settings?: SettingsService) {}
  private dummyHash = argon2.hash('timing-equaliser-not-a-real-password');
  private refreshDays = Number(process.env.REFRESH_TOKEN_DAYS ?? 30);

  private async issue(user: { id: string; email: string }, userAgent?: string) {
    const refreshToken = randomToken();
    await this.prisma.session.create({
      data: { userId: user.id, refreshTokenHash: sha256(refreshToken), userAgent: userAgent?.slice(0, 255),
        expiresAt: new Date(Date.now() + this.refreshDays * DAY) },
    });
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return { accessToken, refreshToken, maxAgeMs: this.refreshDays * DAY };
  }

  async register(dto: RegisterDto, ua?: string) {
    if (this.settings && !(await this.settings.get<boolean>('signups_enabled'))) throw new ForbiddenException('Registration is currently closed');
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email already registered');
    const user = await this.prisma.user.create({
      data: { email, name: dto.name.trim(), passwordHash: await argon2.hash(dto.password) },
    });
    return { user: this.pub(user), ...(await this.issue(user, ua)) };
  }

  async login(dto: LoginDto, ua?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    // Always run one argon2 verify so unknown emails and wrong passwords take the same time.
    const ok = (await argon2.verify(user?.passwordHash ?? (await this.dummyHash), dto.password).catch(() => false)) && !!user;
    if (!user || !ok) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account suspended');
    if (user.systemRole === 'ADMIN') await this.prisma.auditLog.create({ data: { actorId: user.id, action: 'admin.login', targetType: 'user', targetId: user.id, metadata: { userAgent: ua?.slice(0, 120) } } });
    return { user: this.pub(user), ...(await this.issue(user, ua)) };
  }

  /** Rotating refresh: old session revoked; reuse of a revoked token revokes all of the user's sessions. */
  async refresh(token: string | undefined, ua?: string) {
    if (!token) throw new UnauthorizedException();
    const s = await this.prisma.session.findUnique({ where: { refreshTokenHash: sha256(token) }, include: { user: true } });
    if (!s) throw new UnauthorizedException();
    if (s.revokedAt) {
      if (Date.now() - s.revokedAt.getTime() < 10_000) throw new UnauthorizedException(); // benign double-submit (two tabs / StrictMode)
      await this.prisma.session.updateMany({ where: { userId: s.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Session reuse detected');
    }
    if (s.expiresAt < new Date() || s.user.status !== 'ACTIVE') throw new UnauthorizedException();
    await this.prisma.session.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
    return { user: this.pub(s.user), ...(await this.issue(s.user, ua)) };
  }

  async logout(token?: string) {
    if (!token) return;
    await this.prisma.session.updateMany({ where: { refreshTokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(id: string) {
    return this.pub(await this.prisma.user.findUniqueOrThrow({ where: { id } }));
  }
  private pub(u: { id: string; email: string; name: string; systemRole: string }) {
    return { id: u.id, email: u.email, name: u.name, systemRole: u.systemRole };
  }
}
