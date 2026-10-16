import { PrismaClient } from '@prisma/client';
/** The only way to create an admin: run on the server. There is deliberately no API route for this.
 *  Usage: npm run admin:promote -- someone@example.com */
const prisma = new PrismaClient();
(async () => {
  const email = process.argv[2]?.toLowerCase();
  if (!email) throw new Error('Usage: npm run admin:promote -- <email>');
  const u = await prisma.user.update({ where: { email }, data: { systemRole: 'ADMIN' } });
  await prisma.auditLog.create({ data: { actorId: null, action: 'admin.promote_cli', targetType: 'user', targetId: u.id, metadata: { email } } });
  console.log(`${email} is now an admin`);
})().finally(() => prisma.$disconnect());
