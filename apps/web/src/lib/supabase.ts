"use client";

/**
 * Supabase client SDK initialisation (browser-only).
 *
 * Replaces apps/web/src/lib/firebase.ts.
 * For server-side admin operations see apps/web/src/lib/supabase-admin.ts.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let _client: SupabaseClient | null = null;

/** Returns the browser-side Supabase client singleton. */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  if (!publicEnv.supabase.url || !publicEnv.supabase.anonKey) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }
  _client = createClient(publicEnv.supabase.url, publicEnv.supabase.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return !!(publicEnv.supabase.url && publicEnv.supabase.anonKey);
}
