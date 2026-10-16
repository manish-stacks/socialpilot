import { canManageRole, hasRole } from './permissions';
describe('permissions', () => {
  it('orders roles', () => {
    expect(hasRole('OWNER', 'ADMIN')).toBe(true);
    expect(hasRole('VIEWER', 'EDITOR')).toBe(false);
  });
  it('owner manages admins but never owners', () => {
    expect(canManageRole('OWNER', 'ADMIN')).toBe(true);
    expect(canManageRole('OWNER', 'OWNER')).toBe(false);
  });
  it('admin cannot grant admin/owner; editors manage nobody', () => {
    expect(canManageRole('ADMIN', 'ADMIN')).toBe(false);
    expect(canManageRole('ADMIN', 'EDITOR')).toBe(true);
    expect(canManageRole('EDITOR', 'VIEWER')).toBe(false);
  });
});
