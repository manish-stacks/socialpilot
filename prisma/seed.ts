import { PrismaClient } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';
const prisma = new PrismaClient();
async function main() {
  // TEST DATA ONLY — never use in production.
  const passwordHash = await argon2.hash('TestPassword123!');
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.test' },
    update: {},
    create: { email: 'demo@example.test', name: 'Demo User (test data)', passwordHash, emailVerifiedAt: new Date() },
  });
  await prisma.user.upsert({
    where: { email: 'admin@example.test' },
    update: {},
    create: { email: 'admin@example.test', name: 'Admin (test data)', passwordHash, systemRole: 'ADMIN', emailVerifiedAt: new Date() },
  });
  const ws = await prisma.workspace.upsert({
    where: { slug: 'demo-workspace' }, update: {},
    create: { name: 'Demo Workspace (test data)', slug: 'demo-workspace' },
  });
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: user.id } }, update: {},
    create: { workspaceId: ws.id, userId: user.id, role: 'OWNER' },
  });
}
main().finally(() => prisma.$disconnect());
