/**
 * @infrastructure/cache — Upstash Redis cache implementation
 *
 * Implements ICacheService using @upstash/redis with an in-memory LRU fallback
 * (same pattern as middleware/rate-limiter.ts — single source of Redis client).
 *
 * Replaces the three duplicate caching implementations:
 *   - Map-based cache in lib/firebase-client.ts  (30-second TTL)
 *   - Ad-hoc TTL maps in routes/qr.ts
 *   - setInterval cleanup in lib/route-cache.ts
 */

// ─── Interface ────────────────────────────────────────────────────────────────

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  /** Invalidate all keys matching a glob pattern (Redis SCAN-based). */
  invalidatePattern(pattern: string): Promise<void>;
}

export const CACHE_TTL = {
  QR_REDIRECT:     60,   // seconds
  TRUST_SCORE:    300,   // 5 minutes
  USER_PROFILE:   120,   // 2 minutes
  THREAT_PATTERNS: 300,  // 5 minutes
  SCAN_DEDUP:      30,   // 30-second dedup window
} as const;

// ─── In-memory fallback ───────────────────────────────────────────────────────

interface MemEntry { value: unknown; expiresAt: number }
const _mem = new Map<string, MemEntry>();

function memGet<T>(key: string): T | null {
  const e = _mem.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { _mem.delete(key); return null; }
  return e.value as T;
}

function memSet<T>(key: string, value: T, ttlSeconds: number): void {
  _mem.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memDel(key: string): void { _mem.delete(key); }

function memDelPattern(pattern: string): void {
  const regex = new RegExp(
    "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
  );
  for (const k of _mem.keys()) { if (regex.test(k)) _mem.delete(k); }
}

// ─── Redis client (lazy) ──────────────────────────────────────────────────────

let _redis: any = null;
let _redisReady = false;

async function getRedis(): Promise<any> {
  if (_redis) return _redis;
  try {
    const { Redis } = await (import("@upstash/redis") as any).catch(() => ({ Redis: null }));
    if (
      Redis &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      _redis = new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      _redisReady = true;
      console.log("[Cache] Upstash Redis connected");
    } else {
      console.warn("[Cache] Upstash not configured — using in-memory fallback");
    }
  } catch {
    console.warn("[Cache] Failed to load @upstash/redis — using in-memory fallback");
  }
  return _redis;
}

// ─── UpstashCacheService ──────────────────────────────────────────────────────

export class UpstashCacheService implements ICacheService {
  async get<T>(key: string): Promise<T | null> {
    const redis = await getRedis();
    if (_redisReady && redis) {
      try {
        const raw = await redis.get<T>(key);
        return raw ?? null;
      } catch (e) {
        console.warn("[Cache] Redis GET failed, using memory:", e);
      }
    }
    return memGet<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    const redis = await getRedis();
    if (_redisReady && redis) {
      try {
        await redis.set(key, value, { ex: ttlSeconds });
        return;
      } catch (e) {
        console.warn("[Cache] Redis SET failed, using memory:", e);
      }
    }
    memSet(key, value, ttlSeconds);
  }

  async invalidate(key: string): Promise<void> {
    const redis = await getRedis();
    if (_redisReady && redis) {
      try { await redis.del(key); } catch { /* fall through */ }
    }
    memDel(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const redis = await getRedis();
    if (_redisReady && redis) {
      try {
        // SCAN-based bulk delete — safe for large key sets
        let cursor = 0;
        do {
          const [next, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
          cursor = Number(next);
          if (keys.length) await redis.del(...keys);
        } while (cursor !== 0);
        return;
      } catch { /* fall through to memory */ }
    }
    memDelPattern(pattern);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _cacheInstance: UpstashCacheService | null = null;

export function getCacheService(): UpstashCacheService {
  if (!_cacheInstance) _cacheInstance = new UpstashCacheService();
  return _cacheInstance;
}
