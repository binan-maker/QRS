// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT — singleton Supabase client for the mobile app.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces lib/firebase.ts.
// Auth persistence is handled by AsyncStorage on native, localStorage on web.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CONFIG } from "@/config/supabase";
import { Platform } from "react-native";

// ─── Persistence storage ─────────────────────────────────────────────────────
// Supabase needs a storage adapter for session persistence on React Native.

function buildStorage() {
  if (Platform.OS === "web") return undefined; // use localStorage by default
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorageModule = require("@react-native-async-storage/async-storage");
    const AsyncStorage = AsyncStorageModule.default ?? AsyncStorageModule;
    if (!AsyncStorage) return undefined;
    return {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    };
  } catch {
    return undefined;
  }
}

// ─── Client singleton ─────────────────────────────────────────────────────────
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
      storage: buildStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  });
  return _client;
}

// Convenience export for the common case.
export const supabase = getSupabaseClient();
