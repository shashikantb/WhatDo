/**
 * Seed LocalPulse categories into the WhatDo Category table.
 *
 * Adds the location-based / community categories that power the unified
 * WhatDo + LocalPulse experience. Uses upsert so the script is idempotent
 * and safe to re-run.
 *
 * Festival / Ganpati categories are intentionally NOT included.
 *
 * Usage:
 *   node scripts/seed-local-categories.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  {
    name: "Nearby",
    slug: "nearby",
    icon: "MapPin",
    color: "#0ea5e9",
    description: "Posts and updates from people and places near you.",
    sortOrder: 100,
    isActive: true,
  },
  {
    name: "Family",
    slug: "family",
    icon: "Users",
    color: "#ec4899",
    description: "Private posts shared only with your approved family members.",
    sortOrder: 101,
    isActive: true,
  },
  {
    name: "Local News",
    slug: "local-news",
    icon: "Newspaper",
    color: "#f59e0b",
    description: "Neighborhood news, alerts and community updates.",
    sortOrder: 102,
    isActive: true,
  },
  {
    name: "Local Business",
    slug: "local-business",
    icon: "Store",
    color: "#10b981",
    description: "Local businesses, offers, services and announcements.",
    sortOrder: 103,
    isActive: true,
  },
];

async function main() {
  console.log("Seeding local categories...");
  for (const cat of CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        description: cat.description,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      },
      create: cat,
    });
    console.log(`  ✓ ${cat.name} (${cat.slug}) — ${result.id}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
