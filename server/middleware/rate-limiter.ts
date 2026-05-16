import type { Request } from "express";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateEntry { count: number; resetAt: number }

let redisClient: any = null;
let redisAvailable = false;

async function getRedisClient(): Promise<any> {
  if (redisClient) return redisClient;
  try {
    // @ts-ignore - optional dependency
    const { Redis } = await import("@upstash/redis").catch(() => ({ Redis: null }));
    if (Redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      redisAvailable = true;
      console.log("[RateLimiter] Redis initialized");
    } else {
      console.warn("[RateLimiter] Redis not configured, using in-memory fallback");
    }
  } catch (e) {
    console.warn("[RateLimiter] Failed to initialize Redis:", e);
  }
  return redisClient;
}

const memoryMap = new Map<string, RateEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of memoryMap.entries()) {
    if (now > entry.resetAt) memoryMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

export async function checkRateLimit(ip: string): Promise<boolean> {
  const client = await getRedisClient();
  const now = Date.now();

  if (client && redisAvailable) {
    try {
      const key = `ratelimit:${ip}`;
      const current = await client.get(key);
      if (!current) {
        await client.setex(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000), "1");
        return true;
      }
      const count = parseInt(current as string, 10);
      if (count >= RATE_LIMIT_MAX) return false;
      await client.incr(key);
      return true;
    } catch (e) {
      console.warn("[RateLimiter] Redis operation failed, falling back to memory:", e);
    }
  }

  const entry = memoryMap.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
