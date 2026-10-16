import { ForbiddenException } from '@nestjs/common';
import { isValidTimezone, WorkspacesService } from './workspaces.service';

describe('timezone validation', () => {
  it('accepts IANA zones', () => expect(isValidTimezone('Asia/Kolkata')).toBe(true));
  it('rejects junk', () => expect(isValidTimezone('Mars/Base')).toBe(false));
});
describe('WorkspacesService', () => {
  const prisma: any = {
    workspaceMember: { findFirst: jest.fn(), delete: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const svc = new WorkspacesService(prisma);
  it('never removes an owner', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ id: 'm', userId: 'x', role: 'OWNER' });
    await expect(svc.removeMember({ id: 'a', role: 'ADMIN' }, 'w', 'm')).rejects.toThrow(ForbiddenException);
  });
  it('admin cannot remove another admin', async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ id: 'm', userId: 'x', role: 'ADMIN' });
    await expect(svc.removeMember({ id: 'a', role: 'ADMIN' }, 'w', 'm')).rejects.toThrow(ForbiddenException);
  });
  it('invite blocks privilege escalation', async () => {
    await expect(svc.invite({ id: 'a', role: 'ADMIN' }, 'w', { email: 'x@y.z', role: 'ADMIN' })).rejects.toThrow(ForbiddenException);
  });
});
