/**
 * @infrastructure/cache — Redis (Upstash) cache adapter
 *
 * Replaces the three duplicate in-memory caching implementations:
 *   - Map-based cache in server/lib/firebase-client.ts
 *   - Ad-hoc TTL in routes/qr.ts
 *   - Rate limiter state in middleware/rate-limiter.ts
 *
 * Phase 3: implement CacheService using @upstash/redis with in-memory fallback.
 */

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export const CACHE_TTL = {
  QR_REDIRECT:     60,      // seconds — ISR-equivalent for fast redirect
  TRUST_SCORE:     300,     // 5 minutes
  USER_PROFILE:    120,     // 2 minutes
  THREAT_PATTERNS: 300,     // 5 minutes
  SCAN_DEDUP:      30,      // 30-second dedup window
} as const;

// Placeholder — implementation added in Phase 3.
export {};
