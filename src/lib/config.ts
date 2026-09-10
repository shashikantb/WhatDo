import { prisma } from "./db";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cacheMap = new Map<string, CacheEntry<unknown>>();
const fallbackMap = new Map<string, unknown>();

let systemSettingTableExists: boolean | null = null;

async function checkSystemSettingTable(): Promise<boolean> {
  if (systemSettingTableExists !== null) return systemSettingTableExists;
  try {
    const result: any = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SystemSetting'
      ) as exists
    `;
    const firstRow: any = Array.isArray(result) ? result[0] : result;
    systemSettingTableExists = Boolean(firstRow?.exists);
  } catch {
    systemSettingTableExists = false;
  }
  return systemSettingTableExists;
}

function readCache<T>(key: string): T | undefined {
  const entry = cacheMap.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cacheMap.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeCache<T>(key: string, value: T): void {
  cacheMap.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function getSystemSetting<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const cached = readCache<T>(key);
  if (cached !== undefined) return cached;

  const tableExists = await checkSystemSettingTable();
  if (!tableExists) {
    const memValue = fallbackMap.get(key);
    if (memValue === undefined) {
      writeCache(key, fallback);
      return fallback;
    }
    const typed = memValue as T;
    writeCache(key, typed);
    return typed;
  }

  try {
    const row = await (prisma as any).systemSetting.findUnique({
      where: { key },
    });
    if (!row) {
      writeCache(key, fallback);
      return fallback;
    }
    const value = row.value as unknown as T;
    writeCache(key, value);
    return value;
  } catch {
    const memValue = fallbackMap.get(key);
    if (memValue === undefined) {
      writeCache(key, fallback);
      return fallback;
    }
    const typed = memValue as T;
    writeCache(key, typed);
    return typed;
  }
}

export async function setSystemSetting<T>(
  key: string,
  value: T,
): Promise<void> {
  writeCache(key, value);
  fallbackMap.set(key, value);

  const tableExists = await checkSystemSettingTable();
  if (!tableExists) return;

  try {
    await (prisma as any).systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: value as any,
      },
      update: {
        value: value as any,
      },
    });
  } catch {
  }
}

export const GLOBAL_CONFIG_KEYS = {
  AI_MODERATION_ENABLED: "ai.moderation.enabled",
  AI_PROVIDER: "ai.provider",
  OPINION_SCORE_PER_VOTE: "opinion.scorePerVote",
  OPINION_SCORE_PER_POST: "opinion.scorePerPost",
  OPINION_PREDICTION_CORRECT: "opinion.predictionCorrect",
} as const;

export async function getGlobalConfig() {
  const [aiModerationEnabled, aiProvider] = await Promise.all([
    getSystemSetting<boolean>(GLOBAL_CONFIG_KEYS.AI_MODERATION_ENABLED, true),
    getSystemSetting<string>(GLOBAL_CONFIG_KEYS.AI_PROVIDER, "mock"),
  ]);
  return {
    aiModerationEnabled,
    aiProvider,
  };
}

export type GlobalConfig = Awaited<ReturnType<typeof getGlobalConfig>>;

export function getSystemSettingSync<T>(key: string, fallback: T): T {
  const cached = readCache<T>(key);
  if (cached !== undefined) return cached;
  const mem = fallbackMap.get(key);
  if (mem !== undefined) return mem as T;
  return fallback;
}
