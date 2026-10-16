import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceGuard } from './workspace.guard';
import { PostsService } from '../posts/posts.service';
import { jobKey } from '../queue/queue.module';

const ctx = (params: any, user: any, minRole?: string) => ({ switchToHttp: () => ({ getRequest: () => ({ params, user }) }), getHandler: () => null, getClass: () => null, __min: minRole }) as any;
const guard = (member: any, min?: string) => new WorkspaceGuard({ workspaceMember: { findUnique: jest.fn().mockResolvedValue(member) } } as any, { getAllAndOverride: () => min } as any);

describe('WorkspaceGuard (tenant isolation)', () => {
  it('non-members get 404, not 403 (no existence leak)', async () => { await expect(guard(null).canActivate(ctx({ workspaceId: 'w' }, { id: 'u' }))).rejects.toThrow(NotFoundException); });
  it('looks the membership up by BOTH workspace and the authenticated user', async () => {
    const find = jest.fn().mockResolvedValue(null); const g = new WorkspaceGuard({ workspaceMember: { findUnique: find } } as any, { getAllAndOverride: () => undefined } as any);
    await g.canActivate(ctx({ workspaceId: 'w1' }, { id: 'u1' })).catch(() => 0);
    expect(find.mock.calls[0][0].where).toEqual({ workspaceId_userId: { workspaceId: 'w1', userId: 'u1' } });
  });
  it('enforces the minimum role', async () => { await expect(guard({ role: 'VIEWER', workspace: {} }, 'EDITOR').canActivate(ctx({ workspaceId: 'w' }, { id: 'u' }))).rejects.toThrow(ForbiddenException); });
  it('blocks suspended workspaces even for owners', async () => { await expect(guard({ role: 'OWNER', workspace: { suspendedAt: new Date() } }).canActivate(ctx({ workspaceId: 'w' }, { id: 'u' }))).rejects.toThrow(ForbiddenException); });
  it('allows a member with enough role', async () => expect(await guard({ role: 'EDITOR', workspace: {} }, 'EDITOR').canActivate(ctx({ workspaceId: 'w' }, { id: 'u' }))).toBe(true));
});

describe('PostsService tenant scoping and duplicate-publish safety', () => {
  it("get() always filters by the caller's workspace", async () => {
    const find = jest.fn().mockResolvedValue(null); const svc = new PostsService({ post: { findFirst: find } } as any, {} as any);
    await expect(svc.get('wsA', 'postOfWsB')).rejects.toThrow(NotFoundException);
    expect(find.mock.calls[0][0].where).toEqual({ id: 'postOfWsB', workspaceId: 'wsA' });
  });
  it('refuses to replace targets a worker may have claimed (edit-vs-publish race)', async () => {
    const tx: any = { postTarget: { count: jest.fn().mockResolvedValue(2), deleteMany: jest.fn().mockResolvedValue({ count: 1 }) }, postMedia: { deleteMany: jest.fn() }, post: { update: jest.fn() } };
    const prisma: any = { post: { findFirst: jest.fn().mockResolvedValue({ id: 'p', status: 'DRAFT', targets: [], media: [] }) }, socialAccount: { count: jest.fn().mockResolvedValue(0) }, mediaAsset: { count: jest.fn().mockResolvedValue(0) }, $transaction: (fn: any) => fn(tx) };
    await expect(new PostsService(prisma, {} as any).update('w', 'p', { caption: 'x' } as any)).rejects.toThrow(ConflictException);
    expect(tx.post.update).not.toHaveBeenCalled();
    expect(tx.postTarget.deleteMany.mock.calls[0][0].where.status.in).not.toContain('PUBLISHING');
  });
  it('a retry/reschedule gets a fresh BullMQ job id (BullMQ silently ignores duplicate ids)', () => {
    const t = { id: 'x', attempts: 0, polls: 0, post: { scheduledAt: new Date(5) } };
    expect(jobKey({ ...t, generation: 0 })).not.toBe(jobKey({ ...t, generation: 1 }));
  });
});
