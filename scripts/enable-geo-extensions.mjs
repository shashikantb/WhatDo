/**
 * Enable Postgres earthdistance + cube extensions and create a GiST geo index
 * on Post(latitude, longitude) for nearby-post queries.
 *
 * Run: node scripts/enable-geo-extensions.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env.local (handles quoted Neon URLs)
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
  console.log("Enabling earthdistance + cube extensions...");
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS cube;`;
  await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS earthdistance;`;

  const exts = await prisma.$queryRaw`
    SELECT extname FROM pg_extension WHERE extname IN ('cube','earthdistance') ORDER BY extname;
  `;
  console.log("Extensions:", exts);

  console.log("Creating GiST geo index on Post...");
  // Drop if exists (idempotent)
  await prisma.$executeRaw`DROP INDEX IF EXISTS "Post_location_gist";`;
  await prisma.$executeRaw`
    CREATE INDEX "Post_location_gist" ON "Post"
    USING GIST (ll_to_earth("latitude", "longitude"))
    WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
  `;

  const idx = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes WHERE indexname = 'Post_location_gist';
  `;
  console.log("Index created:", idx);

  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
