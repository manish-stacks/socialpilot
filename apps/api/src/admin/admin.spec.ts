import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MaintenanceGuard } from './maintenance.guard';
import { bucketByDay, percentile, retryInfo } from './admin.util';
import { SETTINGS, validateSetting } from '../settings/settings.service';

const ctx = (user: any, extra: any = {}) => ({ switchToHttp: () => ({ getRequest: () => ({ user, method: 'GET', originalUrl: '/api/v1/admin/users?x=1', ...extra }) }), getHandler: () => null, getClass: () => null }) as any;

describe('AdminGuard (server-side authorization)', () => {
  const prisma: any = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
  const guard = new AdminGuard(prisma);
  it('lets admins through', async () => expect(await guard.canActivate(ctx({ id: 'a', systemRole: 'ADMIN' }))).toBe(true));
  it('rejects normal users and records the attempt without leaking the query string', async () => {
    await expect(guard.canActivate(ctx({ id: 'u', systemRole: 'USER' }))).rejects.toThrow(ForbiddenException);
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'admin.access_denied', actorId: 'u', metadata: { path: '/api/v1/admin/users' } });
  });
  it('rejects requests with no user at all', async () => { await expect(guard.canActivate(ctx(undefined))).rejects.toThrow(ForbiddenException); });
  it('is applied to the whole AdminController (no unguarded admin route)', () => {
    expect(Reflect.getMetadata('__guards__', AdminController)).toContain(AdminGuard);
  });
});

describe('AdminService.setUserStatus', () => {
  const mk = (user: any) => {
    const tx: any = { user: { update: jest.fn() }, session: { updateMany: jest.fn() }, auditLog: { create: jest.fn() } };
    const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(user) }, $transaction: (fn: any) => fn(tx) };
    return { svc: new AdminService(prisma), tx };
  };
  it('refuses self-suspension', async () => { await expect(mk({}).svc.setUserStatus('a', 'a', 'SUSPENDED', 'why')).rejects.toThrow(BadRequestException); });
  it('refuses to suspend another admin', async () => { await expect(mk({ id: 'b', systemRole: 'ADMIN', status: 'ACTIVE' }).svc.setUserStatus('a', 'b', 'SUSPENDED', 'why')).rejects.toThrow(ForbiddenException); });
  it('is idempotent-safe', async () => { await expect(mk({ id: 'b', systemRole: 'USER', status: 'SUSPENDED' }).svc.setUserStatus('a', 'b', 'SUSPENDED', 'why')).rejects.toThrow(ConflictException); });
  it('suspends, revokes every session and writes an audit entry with the reason', async () => {
    const { svc, tx } = mk({ id: 'b', email: 'b@x.y', systemRole: 'USER', status: 'ACTIVE' });
    await svc.setUserStatus('a', 'b', 'SUSPENDED', 'spam');
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'b' }, data: { status: 'SUSPENDED' } });
    expect(tx.session.updateMany).toHaveBeenCalledWith({ where: { userId: 'b', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ actorId: 'a', action: 'admin.user.suspend', targetId: 'b', metadata: { reason: 'spam' } });
  });
  it('reactivation does not touch sessions', async () => {
    const { svc, tx } = mk({ id: 'b', email: 'b@x.y', systemRole: 'USER', status: 'SUSPENDED' });
    await svc.setUserStatus('a', 'b', 'ACTIVE', 'appeal'); expect(tx.session.updateMany).not.toHaveBeenCalled();
  });
});

describe('plans', () => {
  it('the free plan cannot be deactivated', async () => {
    const prisma: any = { plan: { findUnique: jest.fn().mockResolvedValue({ code: 'free' }) } };
    await expect(new AdminService(prisma).updatePlan('a', 'p', { active: false })).rejects.toThrow(BadRequestException);
  });
});

describe('settings validation', () => {
  it('accepts valid values', () => { expect(validateSetting('maintenance_mode', true)).toBe(true); expect(validateSetting('support_email', ' help@x.io ')).toBe('help@x.io'); });
  it('rejects wrong types, bad emails and unknown keys', () => {
    expect(() => validateSetting('maintenance_mode', 'yes')).toThrow(); expect(() => validateSetting('support_email', 'nope')).toThrow(); expect(() => validateSetting('database_url', 'x')).toThrow();
  });
  it('rejects over-long text', () => expect(() => validateSetting('ai_system_prompt', 'x'.repeat(5000))).toThrow());
  it('allow-list contains no secret-like keys', () => expect(Object.keys(SETTINGS).some((k) => /secret|token|key|password/.test(k))).toBe(false));
});

describe('MaintenanceGuard', () => {
  const g = (on: boolean) => new MaintenanceGuard({ get: async () => on } as any, { getAllAndOverride: () => false } as any);
  it('blocks normal users during maintenance', async () => { await expect(g(true).canActivate(ctx({ systemRole: 'USER' }))).rejects.toThrow(ServiceUnavailableException); });
  it('never blocks admins', async () => expect(await g(true).canActivate(ctx({ systemRole: 'ADMIN' }))).toBe(true));
  it('passes everyone when off', async () => expect(await g(false).canActivate(ctx({ systemRole: 'USER' }))).toBe(true));
  it('never blocks public routes (login, health)', async () => {
    const pub = new MaintenanceGuard({ get: async () => true } as any, { getAllAndOverride: () => true } as any);
    expect(await pub.canActivate(ctx(undefined))).toBe(true);
  });
});

describe('admin helpers', () => {
  it('retryInfo: healthy failed target is retryable, exhausted flagged', () => {
    expect(retryInfo({ status: 'FAILED', attempts: 5, socialAccount: { status: 'ACTIVE' } }, 5)).toMatchObject({ retryEligible: true, exhausted: true });
  });
  it('retryInfo: uncertain needs confirmation; expired account blocks retry', () => {
    expect(retryInfo({ status: 'UNCERTAIN', attempts: 1, socialAccount: { status: 'ACTIVE' } }, 5)).toMatchObject({ retryEligible: true, needsConfirmation: true });
    expect(retryInfo({ status: 'FAILED', attempts: 1, socialAccount: { status: 'EXPIRED' } }, 5).retryEligible).toBe(false);
  });
  it('percentile & bucketing', () => {
    expect(percentile([1, 2, 3, 4, 100], 50)).toBe(3); expect(percentile([1, 2, 3, 4, 100], 95)).toBe(100); expect(percentile([], 50)).toBeNull();
    expect(bucketByDay([new Date('2026-01-02T01:00Z'), new Date('2026-01-02T23:00Z'), new Date('2026-01-01T00:00Z')])).toEqual([{ date: '2026-01-01', count: 1 }, { date: '2026-01-02', count: 2 }]);
  });
});
