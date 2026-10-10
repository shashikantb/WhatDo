import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const email = 'e2e-nolink-' + Math.floor(Math.random()*99999) + '@whatdo.app';
  const pw = 'Test@2026!';
  const phash = await hash(pw, 10);
  await prisma.$executeRawUnsafe(`DELETE FROM "Account" WHERE "userId" IN (SELECT id FROM "User" WHERE email = $1)`, email);
  await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE email = $1`, email);
  const u = await prisma.user.create({ data: { email, displayName: 'E2E NoLink User', passwordHash: phash, role: 'USER', isVerified: true, username: 'e2e_nolink_'+Date.now(), bio: 'e2e' } });
  console.log(JSON.stringify({email, pw, id: u.id, created: u.createdAt}));
}
main().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1); });
