// Universal storage abstraction that works seamlessly on:
// 1. Web browser (window.localStorage)
// 2. React Native / Expo (@react-native-async-storage/async-storage)
// 3. Node.js / SSR / Vercel (safe in-memory fallback)

export interface UniversalAsyncStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiRemove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
}

const memoryStore = new Map<string, string>();

function getNativeStorage(): any {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return null;
    }
    if ((globalThis as any).__binroAsyncStorage) {
      return (globalThis as any).__binroAsyncStorage;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@react-native-async-storage/async-storage");
    return mod?.default || mod;
  } catch {
    return null;
  }
}

export const universalAsyncStorage: UniversalAsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      const native = getNativeStorage();
      if (native?.getItem) {
        return await native.getItem(key);
      }
      return memoryStore.get(key) ?? null;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      const native = getNativeStorage();
      if (native?.setItem) {
        await native.setItem(key, value);
        return;
      }
      memoryStore.set(key, value);
    } catch {}
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      const native = getNativeStorage();
      if (native?.removeItem) {
        await native.removeItem(key);
        return;
      }
      memoryStore.delete(key);
    } catch {}
  },

  async getAllKeys(): Promise<string[]> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return Object.keys(window.localStorage);
      }
      const native = getNativeStorage();
      if (native?.getAllKeys) {
        const keys = await native.getAllKeys();
        return Array.isArray(keys) ? keys : [];
      }
      return Array.from(memoryStore.keys());
    } catch {
      return [];
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        for (const k of keys) {
          window.localStorage.removeItem(k);
        }
        return;
      }
      const native = getNativeStorage();
      if (native?.multiRemove) {
        await native.multiRemove(keys);
        return;
      }
      for (const k of keys) {
        memoryStore.delete(k);
      }
    } catch {}
  },

  async clear(): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
        return;
      }
      const native = getNativeStorage();
      if (native?.clear) {
        await native.clear();
        return;
      }
      memoryStore.clear();
    } catch {}
  },
};

export default universalAsyncStorage;
