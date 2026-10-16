import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Runs after the global JwtAuthGuard, which re-reads the user from MySQL on every request,
 *  so demoting or suspending an admin takes effect immediately. The role is never taken from the token or the client. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.systemRole === 'ADMIN') return true;
    await this.prisma.auditLog.create({ data: { actorId: req.user?.id ?? null, action: 'admin.access_denied', metadata: { path: String(req.originalUrl).split('?')[0].slice(0, 200), method: req.method } } }).catch(() => undefined);
    throw new ForbiddenException('Administrator access required');
  }
}
