/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO WEB: SUPABASE CLIENT FACTORY & ENVIRONMENT DETECTOR
 * ───────────────────────────────────────────────────────────────────────────────
 * Provides resilient client-side & server-side Supabase client instances.
 * Detects whether real database credentials are configured or using placeholders.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

/**
 * Returns true if valid Supabase connection details are available in environment variables.
 */
export function isWebSupabaseConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  return Boolean(
    url &&
    anonKey &&
    !url.includes("placeholder") &&
    !url.includes("YOUR_PROJECT_REF") &&
    anonKey !== "placeholder-anon-key" &&
    anonKey !== "your_supabase_anon_key"
  );
}

/**
 * Returns the active Supabase client singleton, safely initializing with fallback if unconfigured.
 */
export function getWebSupabase(): SupabaseClient {
  if (clientInstance) return clientInstance;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder.supabase.co";

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  clientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return clientInstance;
}
