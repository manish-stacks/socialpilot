import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { hasRole, Role } from '../common/permissions';

/** Tenant isolation: resolves :workspaceId and checks membership + minimum role server-side. */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const m = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.workspaceId, userId: req.user.id } },
      include: { workspace: { select: { suspendedAt: true } } },
    });
    // Non-members get 404 so workspace existence isn't leaked.
    if (!m) throw new NotFoundException('Workspace not found');
    if (m.workspace?.suspendedAt) throw new ForbiddenException('This workspace is suspended. Contact support.');
    const min = this.reflector.getAllAndOverride<Role>('minRole', [ctx.getHandler(), ctx.getClass()]) ?? 'VIEWER';
    if (!hasRole(m.role as Role, min)) throw new ForbiddenException('Insufficient role');
    req.membership = m;
    return true;
  }
}
