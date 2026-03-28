import AsyncStorage from "@react-native-async-storage/async-storage";

const memCache = new Map<string, { value: unknown; expiresAt: number }>();

async function getCache<T>(key: string): Promise<T | null> {
  const mem = memCache.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.value as T;
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    const { value, expiresAt } = JSON.parse(raw);
    if (expiresAt <= Date.now()) { AsyncStorage.removeItem(`cache_${key}`).catch(() => {}); return null; }
    memCache.set(key, { value, expiresAt });
    return value as T;
  } catch { return null; }
}

async function setCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const expiresAt = Date.now() + ttlMs;
  memCache.set(key, { value, expiresAt });
  try { await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({ value, expiresAt })); } catch {}
}

export function invalidateCache(keyPrefix: string): void {
  for (const k of memCache.keys()) {
    if (k.startsWith(keyPrefix)) memCache.delete(k);
  }
}

export function clearAllMemCache(): void {
  memCache.clear();
}

const TTL = {
  QR_DETAIL: 5 * 60 * 1000,
  OWNER_INFO: 10 * 60 * 1000,
  TRUST_SCORE: 2 * 60 * 1000,
  USER_STATS: 3 * 60 * 1000,
};

export async function getCachedQrDetail<T>(qrId: string, userId: string | null): Promise<T | null> {
  return getCache<T>(`qr_detail_${qrId}_${userId ?? "anon"}`);
}
export async function setCachedQrDetail<T>(qrId: string, userId: string | null, value: T): Promise<void> {
  return setCache<T>(`qr_detail_${qrId}_${userId ?? "anon"}`, value, TTL.QR_DETAIL);
}

export async function getCachedOwnerInfo<T>(qrId: string): Promise<T | null> {
  return getCache<T>(`owner_info_${qrId}`);
}
export async function setCachedOwnerInfo<T>(qrId: string, value: T): Promise<void> {
  return setCache<T>(`owner_info_${qrId}`, value, TTL.OWNER_INFO);
}

export async function getCachedUserStats<T>(userId: string): Promise<T | null> {
  return getCache<T>(`user_stats_${userId}`);
}
export async function setCachedUserStats<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`user_stats_${userId}`, value, TTL.USER_STATS);
}

export function invalidateQrCache(qrId: string): void {
  invalidateCache(`qr_detail_${qrId}`);
  invalidateCache(`owner_info_${qrId}`);
}
export function invalidateUserCache(userId: string): void {
  invalidateCache(`user_stats_${userId}`);
}
