import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { canManageRole, Role } from '../common/permissions';
import { randomToken, sha256 } from '../common/crypto';
import { CreateWorkspaceDto, InviteDto, UpdateWorkspaceDto } from './workspaces.dto';

export const isValidTimezone = (tz: string) => {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
};
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'workspace';
type Actor = { id: string; role: Role };

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  private audit(actorId: string, workspaceId: string, action: string, targetId?: string, metadata?: object) {
    return this.prisma.auditLog.create({ data: { actorId, workspaceId, action, targetType: 'workspace', targetId, metadata } });
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    if (dto.timezone && !isValidTimezone(dto.timezone)) throw new BadRequestException('Invalid timezone');
    const suffix = randomToken().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    return this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({ data: { name: dto.name.trim(), slug: `${slugify(dto.name)}-${suffix}`, timezone: dto.timezone ?? 'UTC' } });
      await tx.workspaceMember.create({ data: { workspaceId: ws.id, userId, role: 'OWNER' } });
      await tx.auditLog.create({ data: { actorId: userId, workspaceId: ws.id, action: 'workspace.create', targetId: ws.id } });
      return ws;
    });
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.workspaceMember.findMany({ where: { userId }, include: { workspace: true }, orderBy: { createdAt: 'asc' } });
    return rows.map((m) => ({ ...m.workspace, role: m.role }));
  }

  async update(actorId: string, id: string, dto: UpdateWorkspaceDto) {
    if (dto.timezone && !isValidTimezone(dto.timezone)) throw new BadRequestException('Invalid timezone');
    const ws = await this.prisma.workspace.update({ where: { id }, data: dto });
    await this.audit(actorId, id, 'workspace.update', id, dto);
    return ws;
  }

  listMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId }, select: { id: true, role: true, createdAt: true, user: { select: { id: true, email: true, name: true } } },
    });
  }

  async updateMemberRole(actor: Actor, workspaceId: string, memberId: string, role: Role) {
    const m = await this.prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
    if (!m) throw new NotFoundException('Member not found');
    if (!canManageRole(actor.role, m.role as Role) || !canManageRole(actor.role, role)) throw new ForbiddenException('Cannot manage this role');
    const res = await this.prisma.workspaceMember.update({ where: { id: memberId }, data: { role } });
    await this.audit(actor.id, workspaceId, 'member.role_change', memberId, { from: m.role, to: role });
    return res;
  }

  async removeMember(actor: Actor, workspaceId: string, memberId: string) {
    const m = await this.prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
    if (!m) throw new NotFoundException('Member not found');
    if (m.role === 'OWNER') throw new ForbiddenException('Owner cannot be removed');
    if (m.userId !== actor.id && !canManageRole(actor.role, m.role as Role)) throw new ForbiddenException('Cannot remove this member');
    await this.prisma.workspaceMember.delete({ where: { id: memberId } });
    await this.audit(actor.id, workspaceId, 'member.remove', memberId);
  }

  /** Raw token is returned once (email delivery comes later); only its hash is stored. */
  async invite(actor: Actor, workspaceId: string, dto: InviteDto) {
    if (!canManageRole(actor.role, dto.role)) throw new ForbiddenException('Cannot grant this role');
    const email = dto.email.toLowerCase();
    if (await this.prisma.workspaceMember.findFirst({ where: { workspaceId, user: { email } } })) throw new BadRequestException('Already a member');
    const token = randomToken();
    const inv = await this.prisma.invitation.create({
      data: { workspaceId, email, role: dto.role, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 7 * 86_400_000) },
    });
    await this.audit(actor.id, workspaceId, 'member.invite', inv.id, { email, role: dto.role });
    return { id: inv.id, email, role: dto.role, expiresAt: inv.expiresAt, token };
  }

  async acceptInvite(userId: string, userEmail: string, token: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { tokenHash: sha256(token) } });
    if (!inv || inv.acceptedAt || inv.expiresAt < new Date() || inv.email !== userEmail.toLowerCase())
      throw new BadRequestException('Invalid or expired invitation');
    await this.prisma.$transaction([
      this.prisma.workspaceMember.create({ data: { workspaceId: inv.workspaceId, userId, role: inv.role } }),
      this.prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
    ]);
    return { workspaceId: inv.workspaceId };
  }
}
