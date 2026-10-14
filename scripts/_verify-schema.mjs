// Verify Task 1 schema: new tables + columns on User/Post
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) continue;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('FamilyRelationship','BusinessService','BusinessHour','BusinessResource','Appointment','SosAlert','SosAlertRecipient')
    ORDER BY table_name;
  `;
  console.log("New tables:", tables.map(r => r.table_name));

  const userCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='User' AND column_name IN ('latitude','longitude','lastLocationUpdatedAt','isBusiness','businessName','businessCategory','businessDescription')
    ORDER BY column_name;
  `;
  console.log("User new columns:", userCols.map(r => r.column_name));

  const postCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='Post' AND column_name IN ('latitude','longitude','city','isFamilyPost','hideLocation')
    ORDER BY column_name;
  `;
  console.log("Post new columns:", postCols.map(r => r.column_name));

  const enums = await prisma.$queryRaw`
    SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='NotificationType') ORDER BY enumlabel;
  `;
  console.log("NotificationType values:", enums.map(r => r.enumlabel));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
