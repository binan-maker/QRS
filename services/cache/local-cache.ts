import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.expiresAt <= Date.now()) {
      AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {}
}

export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}
