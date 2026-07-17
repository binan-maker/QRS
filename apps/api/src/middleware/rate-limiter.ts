/**
 * Sliding-window rate limiter.
 *
 * Storage: Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 *          in-memory Map fallback otherwise (single-instance only).
 *
 * checkRateLimit(key, max?, windowMs?) — returns true if the request is allowed.
 * getClientIp(req) — extracts the real client IP from proxy headers.
 */

import type { Request } from "express";

// ─── Defaults (kept for backward compatibility) ───────────────────────────────
const DEFAULT_MAX = 10;
const DEFAULT_WINDOW_MS = 60_000;

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
      console.warn("[RateLimiter] Redis not configured — using in-memory fallback");
    }
  } catch (e) {
    console.warn("[RateLimiter] Failed to initialize Redis:", e);
  }
  return redisClient;
}

const memoryMap = new Map<string, RateEntry>();

// Sweep expired in-memory entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryMap.entries()) {
    if (now > entry.resetAt) memoryMap.delete(key);
  }
}, DEFAULT_WINDOW_MS);

/**
 * Check (and record) a rate-limit hit for the given key.
 *
 * @param key       Namespaced key, e.g. "strict:uid:abc123" or "pub:ip:1.2.3.4"
 * @param max       Maximum hits allowed in the window (default 10)
 * @param windowMs  Window duration in ms (default 60 000)
 * @returns true if the request is within the limit, false if it should be blocked
 */
export async function checkRateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS,
): Promise<boolean> {
  const client = await getRedisClient();
  const now = Date.now();

  if (client && redisAvailable) {
    try {
      const redisKey = `rl:${key}`;
      const current = await client.get(redisKey);
      if (!current) {
        await client.setex(redisKey, Math.ceil(windowMs / 1000), "1");
        return true;
      }
      const count = parseInt(current as string, 10);
      if (count >= max) return false;
      await client.incr(redisKey);
      return true;
    } catch (e) {
      console.warn("[RateLimiter] Redis error — falling back to memory:", e);
    }
  }

  // In-memory fallback
  const entry = memoryMap.get(key);
  if (!entry || now > entry.resetAt) {
    memoryMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

/**
 * Extract the real client IP from forwarded headers (proxy-aware).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
