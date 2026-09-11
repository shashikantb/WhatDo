#!/usr/bin/env node
/**
 * scripts/prisma-env.mjs — Zero-dependency env loader for Prisma CLI commands.
 *
 * Why this exists:
 *   npm run scripts invoke prisma *before* Next.js or Prisma's built-in dotenv
 *   has a chance to parse .env.local, so shell-level substitutions like
 *     DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}" prisma …
 *   resolve DIRECT_DATABASE_URL → "" from the parent shell (empty).
 *
 *   This script:
 *     1. Loads .env.local → falls back to .env → falls back to NODE_ENV.env
 *        using a simple parser (handles quoted values, comments, inline #,
 *        and escaped quotes — safe for Neon URLs with ?sslmode=&channel_binding=).
 *     2. Optionally remaps DATABASE_URL to DIRECT_DATABASE_URL when the
 *        --use-direct flag appears before the "prisma" subcommand.
 *     3. Replaces the current process with prisma, preserving all args after
 *        the (optional) --use-direct flag.
 *
 * Usage:
 *   node scripts/prisma-env.mjs              prisma db push
 *   node scripts/prisma-env.mjs --use-direct prisma db push
 *   node scripts/prisma-env.mjs --use-direct prisma migrate deploy
 *
 * In package.json:
 *   "db:push":        "node scripts/prisma-env.mjs prisma db push"
 *   "db:push:direct": "node scripts/prisma-env.mjs --use-direct prisma db push"
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const useDirect = args[0] === "--use-direct";
const rest = useDirect ? args.slice(1) : args;
const cmd = rest[0]; // expected: "prisma"
const cmdArgs = rest.slice(1);

function parseEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const raw = readFileSync(path, "utf8");
  for (let line of raw.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    let key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
    } else {
      const hash = value.search(/(^|[^\\])#/);
      if (hash >= 0) value = value.slice(0, hash === 0 ? 0 : hash + 1).trimEnd();
      value = value.replace(/\\#/g, "#");
    }
    env[key] = value;
  }
  return env;
}

function applyEnv(file) {
  const parsed = parseEnvFile(file);
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

const env = process.env.NODE_ENV || "development";
applyEnv(join(ROOT, `.env.${env}.local`));
applyEnv(join(ROOT, `.env.local`));
applyEnv(join(ROOT, `.env.${env}`));
applyEnv(join(ROOT, `.env`));

if (useDirect) {
  const direct = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!direct) {
    console.error("[prisma-env] --use-direct requested but DIRECT_DATABASE_URL and DATABASE_URL are both empty.");
    console.error("[prisma-env] Populate at least one in .env.local (see .env.example section 2).");
    process.exit(1);
  }
  process.env.DATABASE_URL = direct;
}

if (!process.env.DATABASE_URL) {
  console.error("[prisma-env] DATABASE_URL is still empty after loading .env* files.");
  console.error("[prisma-env] Create .env.local or populate env vars (see .env.example).");
  process.exit(1);
}

if (cmd !== "prisma") {
  console.error("[prisma-env] Usage: node scripts/prisma-env.mjs [--use-direct] prisma <subcommand> [args...]");
  process.exit(2);
}

let prismaCli;
try {
  const nodeRequire = createRequire(import.meta.url);
  const prismaPkg = nodeRequire.resolve("prisma/package.json", { paths: [ROOT] });
  const prismaDir = dirname(prismaPkg);
  const pkg = JSON.parse(readFileSync(prismaPkg, "utf8"));
  const binEntry =
    (typeof pkg.bin === "string" && pkg.bin) ||
    (typeof pkg.bin === "object" && pkg.bin && (pkg.bin.prisma || pkg.bin["prisma-bin"]));
  if (!binEntry) throw new Error("prisma bin not declared in prisma/package.json");
  prismaCli = join(prismaDir, binEntry);
} catch (err) {
  console.error("[prisma-env] Could not locate prisma CLI. Run `npm install` first.", err.message);
  process.exit(3);
}

const res = spawnSync(process.execPath, [prismaCli, ...cmdArgs], {
  stdio: "inherit",
  cwd: ROOT,
  env: process.env,
});

if (res.error) {
  console.error("[prisma-env] Failed to spawn prisma:", res.error.message);
  process.exit(res.status ?? 127);
}
process.exit(res.status ?? 0);
