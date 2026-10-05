// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIGURATION — single source of truth for Supabase project metadata,
// canonical table names, views, and storage buckets across Web & Mobile.
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPABASE_TABLES = {
  USERS: "users",
  USERNAMES: "usernames",
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
  /** Supabase project URL — e.g. https://xxxx.supabase.co */
  get url() {
    return getSupabaseEnvConfig().url;
  },
  /** Supabase anon/public key — safe to expose in the bundle. */
  get anonKey() {
    return getSupabaseEnvConfig().anonKey;
  },
} as const;
