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

/**
 * Clears all AsyncStorage cache entries for this user.
 * Called on sign out to ensure no cached data persists between sessions.
 */
export async function clearAllAsyncStorageCache(): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((k) => k.startsWith("cache_"));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {}
}

const TTL = {
  QR_DETAIL: 5 * 60 * 1000,
  OWNER_INFO: 10 * 60 * 1000,
  TRUST_SCORE: 2 * 60 * 1000,
  USER_STATS: 3 * 60 * 1000,
  HISTORY_PAGE: 5 * 60 * 1000,
  HOME_SCANS: 30 * 60 * 1000,
  FAVORITES: 5 * 60 * 1000,
  SCAN_STATS: 5 * 60 * 1000,
  PROFILE_EXTRAS: 10 * 60 * 1000,
  PHOTO_URL: 10 * 60 * 1000,
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
  invalidateCache(`profile_extras_${userId}`);
  invalidateCache(`photo_url_${userId}`);
}

export async function getCachedHomeScans<T>(userId: string): Promise<T | null> {
  return getCache<T>(`home_scans_${userId}`);
}
export async function setCachedHomeScans<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`home_scans_${userId}`, value, TTL.HOME_SCANS);
}
export function invalidateHomeScansCache(userId: string): void {
  invalidateCache(`home_scans_${userId}`);
}

export async function getCachedHistoryPage<T>(userId: string): Promise<T | null> {
  return getCache<T>(`history_page_${userId}`);
}
export async function setCachedHistoryPage<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`history_page_${userId}`, value, TTL.HISTORY_PAGE);
}

export async function getCachedFavorites<T>(userId: string): Promise<T | null> {
  return getCache<T>(`favorites_${userId}`);
}
export async function setCachedFavorites<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`favorites_${userId}`, value, TTL.FAVORITES);
}

export async function getCachedScanStats<T>(userId: string): Promise<T | null> {
  return getCache<T>(`scan_stats_${userId}`);
}
export async function setCachedScanStats<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`scan_stats_${userId}`, value, TTL.SCAN_STATS);
}

export async function getCachedProfileExtras<T>(userId: string): Promise<T | null> {
  return getCache<T>(`profile_extras_${userId}`);
}
export async function setCachedProfileExtras<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`profile_extras_${userId}`, value, TTL.PROFILE_EXTRAS);
}

export async function getCachedPhotoURL(userId: string): Promise<string | null> {
  return getCache<string>(`photo_url_${userId}`);
}
export async function setCachedPhotoURL(userId: string, value: string | null): Promise<void> {
  if (!value) return;
  return setCache<string>(`photo_url_${userId}`, value, TTL.PHOTO_URL);
}

export function invalidateHistoryCache(userId: string): void {
  invalidateCache(`history_page_${userId}`);
  invalidateCache(`favorites_${userId}`);
  invalidateCache(`scan_stats_${userId}`);
}

const TTL_FOLLOWING   = 5  * 60 * 1000;
const TTL_COMMENTS    = 5  * 60 * 1000;
const TTL_GENERATED_QRS = 2 * 60 * 1000;

export async function getCachedFollowing<T>(userId: string): Promise<T | null> {
  return getCache<T>(`following_${userId}`);
}
export async function setCachedFollowing<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`following_${userId}`, value, TTL_FOLLOWING);
}
export function invalidateFollowingCache(userId: string): void {
  invalidateCache(`following_${userId}`);
}

export async function getCachedComments<T>(userId: string): Promise<T | null> {
  return getCache<T>(`comments_${userId}`);
}
export async function setCachedComments<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`comments_${userId}`, value, TTL_COMMENTS);
}
export function invalidateCommentsCache(userId: string): void {
  invalidateCache(`comments_${userId}`);
}

export async function getCachedGeneratedQrs<T>(userId: string): Promise<T | null> {
  return getCache<T>(`generated_qrs_${userId}`);
}
export async function setCachedGeneratedQrs<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`generated_qrs_${userId}`, value, TTL_GENERATED_QRS);
}

const TTL_PRIVACY = 5 * 60 * 1000; // 5 minutes

export async function getCachedPrivacySettings<T>(userId: string): Promise<T | null> {
  return getCache<T>(`privacy_settings_${userId}`);
}
export async function setCachedPrivacySettings<T>(userId: string, value: T): Promise<void> {
  return setCache<T>(`privacy_settings_${userId}`, value, TTL_PRIVACY);
}
export function invalidatePrivacyCache(userId: string): void {
  invalidateCache(`privacy_settings_${userId}`);
}
