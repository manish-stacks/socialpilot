import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { sha256 } from '../common/crypto';

const mk = (session: any) => {
  const prisma: any = {
    session: { findUnique: jest.fn().mockResolvedValue(session), update: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
  };
  const jwt: any = { signAsync: jest.fn().mockResolvedValue('access') };
  return { svc: new AuthService(prisma, jwt), prisma };
};
const user = { id: 'u1', email: 'a@b.c', name: 'A', systemRole: 'USER', status: 'ACTIVE' };

describe('AuthService.refresh', () => {
  it('rejects missing token', async () => {
    await expect(mk(null).svc.refresh(undefined)).rejects.toThrow(UnauthorizedException);
  });
  it('revokes all sessions when a revoked token is reused', async () => {
    const { svc, prisma } = mk({ id: 's', userId: 'u1', revokedAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 1e6), user });
    await expect(svc.refresh('tok')).rejects.toThrow(UnauthorizedException);
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }));
  });
  it('tolerates a double-submit right after rotation without logging everyone out', async () => {
    const { svc, prisma } = mk({ id: 's', userId: 'u1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 1e6), user });
    await expect(svc.refresh('tok')).rejects.toThrow(UnauthorizedException);
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });
  it('rotates a valid token', async () => {
    const { svc, prisma } = mk({ id: 's', userId: 'u1', revokedAt: null, expiresAt: new Date(Date.now() + 1e6), user });
    const r = await svc.refresh('tok');
    expect(r.accessToken).toBe('access');
    expect(prisma.session.update).toHaveBeenCalled();
    expect(prisma.session.create.mock.calls[0][0].data.refreshTokenHash).not.toBe(sha256('tok'));
  });
  it('rejects expired session', async () => {
    const { svc } = mk({ id: 's', userId: 'u1', revokedAt: null, expiresAt: new Date(Date.now() - 1), user });
    await expect(svc.refresh('tok')).rejects.toThrow(UnauthorizedException);
  });
});
