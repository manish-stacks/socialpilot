export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
const rank: Record<Role, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3, OWNER: 4 };
export const hasRole = (actual: Role, min: Role) => rank[actual] >= rank[min];
/** OWNER may manage any non-owner role; ADMIN only roles strictly below ADMIN. */
export function canManageRole(actor: Role, target: Role): boolean {
  if (actor === 'OWNER') return target !== 'OWNER';
  if (actor === 'ADMIN') return rank[target] < rank.ADMIN;
  return false;
}
