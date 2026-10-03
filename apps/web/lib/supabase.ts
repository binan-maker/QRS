// ═══════════════════════════════════════════════════════════════════════════════
// WEB SUPABASE CLIENT — singleton Supabase client for Next.js web app.
// Shares globalThis.__binroSupabaseClient with root lib/supabase.ts.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const isBrowserWeb =
  typeof window !== "undefined" && typeof document !== "undefined";

const globalForSupabase = globalThis as unknown as {
  __binroSupabaseClient?: SupabaseClient;
};

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

export function getSupabaseClient(): SupabaseClient {
  if (globalForSupabase.__binroSupabaseClient) {
    return globalForSupabase.__binroSupabaseClient;
  }

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

  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: isBrowserWeb,
      persistSession: isBrowserWeb,
      detectSessionInUrl: isBrowserWeb,
    },
  });

  globalForSupabase.__binroSupabaseClient = client;
  return client;
}

export function getWebSupabase(): SupabaseClient {
  return getSupabaseClient();
}

export const supabase: SupabaseClient = getSupabaseClient();
