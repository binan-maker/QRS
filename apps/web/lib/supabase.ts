// ═══════════════════════════════════════════════════════════════════════════════
// WEB & SERVER SUPABASE CLIENT FACTORY
// 100% self-contained with zero relative or path-alias imports so both
// Next.js (Turbopack/Webpack) and Expo (Metro) bundle without resolution errors.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_TABLES = {
  USERS: "users",
  USERNAMES: "usernames",
  PUBLIC_PROFILES_VIEW: "public_profiles",
  QR_CODES: "qr_codes",
  QR_SCANS: "qr_scans",
  QR_COMMENTS: "qr_comments",
  COMMENT_LIKES: "comment_likes",
  QR_REPORTS: "qr_reports",
} as const;

export const SUPABASE_VIEWS = {
  PUBLIC_PROFILES: "public_profiles",
} as const;

export const SUPABASE_BUCKETS = {
  AVATARS: "avatars",
} as const;

export function getSupabaseEnvConfig() {
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const isConfigured = Boolean(
    url &&
      anonKey &&
      !url.includes("placeholder") &&
      !url.includes("YOUR_PROJECT_REF") &&
      anonKey !== "placeholder-anon-key" &&
      anonKey !== "your_supabase_anon_key"
  );

  const hasServiceRole = Boolean(
    isConfigured &&
      serviceRoleKey &&
      serviceRoleKey !== "your_service_role_key" &&
      serviceRoleKey !== "placeholder-service-role-key"
  );

  return {
    url,
    anonKey,
    serviceRoleKey,
    isConfigured,
    hasServiceRole,
  };
}

export const SUPABASE_CONFIG = {
  get url() {
    return getSupabaseEnvConfig().url;
  },
  get anonKey() {
    return getSupabaseEnvConfig().anonKey;
  },
} as const;

const isBrowserWeb =
  typeof window !== "undefined" && typeof document !== "undefined";

const globalForSupabase = globalThis as unknown as {
  __binroSupabaseClient?: SupabaseClient;
};

export function isWebSupabaseConfigured(): boolean {
  return getSupabaseEnvConfig().isConfigured;
}

export function getSupabaseClient(): SupabaseClient {
  if (globalForSupabase.__binroSupabaseClient) {
    return globalForSupabase.__binroSupabaseClient;
  }

  const { url, anonKey } = getSupabaseEnvConfig();

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

export function createServerSupabaseClient(
  accessToken?: string | null
): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseEnvConfig();
  if (!isConfigured) return null;

  const cleanToken = accessToken?.replace(/^Bearer\s+/i, "").trim();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(cleanToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
            },
          },
        }
      : {}),
  });
}

export function createAdminSupabaseClient(): SupabaseClient | null {
  const { url, serviceRoleKey, hasServiceRole } = getSupabaseEnvConfig();
  if (!hasServiceRole) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getBestServerSupabaseClient(
  accessToken?: string | null
): SupabaseClient | null {
  return createAdminSupabaseClient() ?? createServerSupabaseClient(accessToken);
}

export const supabase: SupabaseClient = getSupabaseClient();
