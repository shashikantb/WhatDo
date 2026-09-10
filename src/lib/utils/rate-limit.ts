import { Redis } from "@upstash/redis";

type InMemoryBucket = {
  count: number;
  resetTime: number;
};

const inMemoryStore = new Map<string, InMemoryBucket>();

const hasUpstashEnv =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (!hasUpstashEnv) return null;
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  vote: { limit: 30, windowMs: 60 * 1000 },
  createPost: { limit: 5, windowMs: 60 * 60 * 1000 },
  createComment: { limit: 20, windowMs: 60 * 60 * 1000 },
  follow: { limit: 50, windowMs: 60 * 60 * 1000 },
  auth: { limit: 5, windowMs: 15 * 60 * 1000 },
  upload: { limit: 20, windowMs: 60 * 60 * 1000 },
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

async function checkInMemory(
  key: string,
  identifier: string,
): Promise<RateLimitResult> {
  const cfg = RATE_LIMIT_CONFIGS[key];
  if (!cfg) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
  const fullKey = `${key}:${identifier}`;
  const now = Date.now();
  const bucket = inMemoryStore.get(fullKey);
  if (!bucket || bucket.resetTime <= now) {
    inMemoryStore.set(fullKey, {
      count: 1,
      resetTime: now + cfg.windowMs,
    });
    return {
      success: true,
      limit: cfg.limit,
      remaining: cfg.limit - 1,
      reset: now + cfg.windowMs,
    };
  }
  if (bucket.count >= cfg.limit) {
    return {
      success: false,
      limit: cfg.limit,
      remaining: 0,
      reset: bucket.resetTime,
    };
  }
  bucket.count += 1;
  return {
    success: true,
    limit: cfg.limit,
    remaining: cfg.limit - bucket.count,
    reset: bucket.resetTime,
  };
}

async function checkRedis(
  key: string,
  identifier: string,
  redis: Redis,
): Promise<RateLimitResult | null> {
  const cfg = RATE_LIMIT_CONFIGS[key];
  if (!cfg) return null;

  const fullKey = `rl:${key}:${identifier}`;
  const now = Date.now();
  const windowStart = now - cfg.windowMs;

  try {
    const results = await redis
      .multi()
      .zremrangebyscore(fullKey, 0, windowStart)
      .zcard(fullKey)
      .zadd(fullKey, { score: now, member: `${now}-${Math.random()}` })
      .expire(fullKey, Math.ceil(cfg.windowMs / 1000) + 1)
      .exec();

    const count = results ? Number(results[1]) || 0 : 0;
    const reset = now + cfg.windowMs;

    if (count >= cfg.limit) {
      return {
        success: false,
        limit: cfg.limit,
        remaining: 0,
        reset,
      };
    }

    return {
      success: true,
      limit: cfg.limit,
      remaining: cfg.limit - count - 1,
      reset,
    };
  } catch {
    return null;
  }
}

export async function rateLimit(
  key: keyof typeof RATE_LIMIT_CONFIGS | string,
  identifier: string,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    const res = await checkRedis(key, identifier, redis);
    if (res) return res;
  }
  return checkInMemory(key, identifier);
}
