// Quick test for nearbyPosts geo query (TR-2.1, TR-2.2)
// Run: npx tsx scripts/_test-geo.ts
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

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

const prisma = new PrismaClient();

const CENTER = { lat: 19.076, lng: 72.8777 };
const POINTS = [
  { name: "Andheri", lat: 19.1197, lng: 72.8468 },
  { name: "Thane", lat: 19.2183, lng: 72.9781 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
];

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true, username: true } });
  if (!user) { console.error("No user found"); return; }
  console.log("Using user:", user.username);

  const created: string[] = [];
  for (const p of POINTS) {
    const post = await prisma.post.create({
      data: {
        question: `[GEO-TEST] ${p.name} nearby post`,
        slug: `geo-test-${p.name.toLowerCase()}-${Date.now()}`,
        type: "POLL",
        creatorId: user.id,
        status: "PUBLISHED",
        latitude: p.lat,
        longitude: p.lng,
        city: p.name,
        options: { create: [{ label: "Yes", value: "yes", sortOrder: 0 }, { label: "No", value: "no", sortOrder: 1 }] },
      },
      select: { id: true },
    });
    created.push(post.id);
  }

  const { nearbyPosts } = await import("../src/lib/db/queries/geo.queries");
  const res50 = await nearbyPosts({ centerLat: CENTER.lat, centerLng: CENTER.lng, radiusKm: 50, limit: 10 });
  console.log("\n--- 50km radius results ---");
  for (const r of res50.items) {
    console.log(`  ${r.city} (${r.distanceKm.toFixed(2)} km)`);
  }

  const cities50 = res50.items.map(r => r.city);
  const andheriOk = cities50.includes("Andheri");
  const thaneOk = cities50.includes("Thane");
  const puneExcluded = !cities50.includes("Pune");
  const orderedOk = res50.items.length >= 2 && res50.items[0].distanceKm < res50.items[1].distanceKm;
  console.log(`\nTR-2.1 (in-radius + ordered): ${andheriOk && thaneOk && puneExcluded && orderedOk ? "PASS" : "FAIL"}`);

  const famPost = await prisma.post.create({
    data: {
      question: "[GEO-TEST] Family post should be excluded",
      slug: `geo-test-family-${Date.now()}`,
      type: "POLL",
      creatorId: user.id,
      status: "PUBLISHED",
      latitude: CENTER.lat + 0.01,
      longitude: CENTER.lng + 0.01,
      isFamilyPost: true,
      options: { create: [{ label: "Yes", value: "yes", sortOrder: 0 }, { label: "No", value: "no", sortOrder: 1 }] },
    },
  });
  const resFam = await nearbyPosts({ centerLat: CENTER.lat, centerLng: CENTER.lng, radiusKm: 50, limit: 50 });
  const famExcluded = !resFam.items.some(r => r.id === famPost.id);
  console.log(`TR-2.2 (family posts excluded): ${famExcluded ? "PASS" : "FAIL"}`);

  await prisma.post.deleteMany({ where: { id: { in: [...created, famPost.id] } } });
  console.log("Cleaned up test posts.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
