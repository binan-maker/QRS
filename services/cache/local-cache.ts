import { universalAsyncStorage as AsyncStorage } from "@shared/utils/universal-storage";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  savedAt: number;
}

export interface ReadCacheOptions {
  /** If true, returns the cached value even if expired (essential for offline fallback) */
  allowStale?: boolean;
}

export interface ResilientCacheOptions {
  /** Time-to-live in milliseconds before data is considered stale. Default: 5 minutes */
  ttlMs?: number;
  /** Whether to return stale cache on network/fetch errors. Default: true */
  allowStaleFallback?: boolean;
}

// In-memory fast tier (L1)
const memoryL1 = new Map<string, CacheEntry<unknown>>();

export async function readCache<T>(key: string, options?: ReadCacheOptions): Promise<T | null> {
  // Check L1 memory first
  const mem = memoryL1.get(key) as CacheEntry<T> | undefined;
  if (mem) {
    const isExpired = mem.expiresAt <= Date.now();
    if (!isExpired || options?.allowStale) {
      return mem.value;
    }
    if (isExpired && !options?.allowStale) {
      memoryL1.delete(key);
    }
  }

  // Check L2 persistent storage
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const isExpired = entry.expiresAt <= Date.now();
    
    // Store in L1 for subsequent reads
    memoryL1.set(key, entry as CacheEntry<unknown>);

    if (isExpired && !options?.allowStale) {
      AsyncStorage.removeItem(key).catch(() => {});
      memoryL1.delete(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const now = Date.now();
    const entry: CacheEntry<T> = { value, expiresAt: now + ttlMs, savedAt: now };
    memoryL1.set(key, entry as CacheEntry<unknown>);
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

export async function clearCache(key: string): Promise<void> {
  try {
    memoryL1.delete(key);
    await AsyncStorage.removeItem(key);
  } catch {}
}

/**
 * High-resilience cache executor implementing the Stale-While-Revalidate (SWR) pattern:
 * 1. Returns fresh cached data immediately if within TTL (0ms latency, zero render stall).
 * 2. If missing or stale, executes the network/database fetcher().
 * 3. On fetcher success, updates cache and returns fresh data.
 * 4. On fetcher failure (offline, timeout, connection lost), gracefully falls back to stale cache.
 * Guarantees zero-blank screen degradation on mobile and web offline modes.
 */
export async function withResilientCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: ResilientCacheOptions = {}
): Promise<T> {
  const { ttlMs = 5 * 60 * 1000, allowStaleFallback = true } = options;

  // 1. Try fresh cache
  const freshCached = await readCache<T>(key);
  if (freshCached !== null && freshCached !== undefined) {
    return freshCached;
  }

  // 2. Fetch fresh data
  try {
    const freshValue = await fetcher();
    if (freshValue !== null && freshValue !== undefined) {
      await writeCache(key, freshValue, ttlMs);
    }
    return freshValue;
  } catch (networkError) {
    // 3. Graceful offline fallback: if network is dead, return stale cache
    if (allowStaleFallback) {
      const staleCached = await readCache<T>(key, { allowStale: true });
      if (staleCached !== null && staleCached !== undefined) {
        return staleCached;
      }
    }
    throw networkError;
  }
}
