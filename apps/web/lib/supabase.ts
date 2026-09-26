import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isWebSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    anonKey &&
    !url.includes("placeholder") &&
    !url.includes("YOUR_PROJECT_REF")
  );
}

export function getWebSupabase(): SupabaseClient {
  if (client) return client;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-anon-key";

  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}