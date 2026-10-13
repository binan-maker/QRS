import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_TABLES = {
  USERS: "users",
  USERNAMES: "usernames",
  QR_CODES: "qr_codes",
  QR_SCANS: "qr_scans",
  QR_COMMENTS: "qr_comments",
  COMMENT_LIKES: "comment_likes",
  QR_REPORTS: "qr_reports",
  FEEDBACK: "feedback",
  REFERRALS: "referrals",
} as const;

export const SUPABASE_BUCKETS = {
  AVATARS: "avatars",
} as const;

export function getSupabaseEnvConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, anonKey, serviceRoleKey };
}

export const SUPABASE_CONFIG = getSupabaseEnvConfig();

export function isWebSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnvConfig();
  return Boolean(
    url &&
      anonKey &&
      !url.includes("YOUR_PROJECT_REF") &&
      anonKey !== "your_supabase_anon_key"
  );
}

let _supabaseInstance: SupabaseClient | null = null;

export function getWebSupabase(): SupabaseClient {
  if (!_supabaseInstance) {
    const { url, anonKey } = getSupabaseEnvConfig();
    _supabaseInstance = createClient(
      url || "https://placeholder.supabase.co",
      anonKey || "placeholder",
      {
        auth: {
          persistSession: typeof window !== "undefined",
          autoRefreshToken: typeof window !== "undefined",
        },
      }
    );
  }
  return _supabaseInstance;
}

export const supabase = getWebSupabase();

export function createServerSupabaseClient(token?: string): SupabaseClient | null {
  const { url, anonKey } = getSupabaseEnvConfig();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

export function createAdminSupabaseClient(): SupabaseClient | null {
  const { url, serviceRoleKey, anonKey } = getSupabaseEnvConfig();
  const key = serviceRoleKey || anonKey;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getSupabaseAdmin = createAdminSupabaseClient;

export function getBestServerSupabaseClient(token?: string): SupabaseClient | null {
  return createAdminSupabaseClient() || createServerSupabaseClient(token);
}

export default supabase;
