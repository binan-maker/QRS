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

export const SUPABASE_BUCKETS = {
  AVATARS: "avatars",
} as const;

export function getSupabaseEnvConfig() {
  const envUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();

  const envAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();

  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  // Configured solely if real credentials are provided in .env.
  // When credentials are not provided (e.g. kept local for credential safety),
  // isConfigured evaluates cleanly to false without fragile placeholder string checks.
  const isConfigured = Boolean(envUrl && envAnonKey);
  const hasServiceRole = Boolean(isConfigured && serviceRoleKey);

  return {
    url: envUrl || "https://placeholder.supabase.co",
    anonKey: envAnonKey || "placeholder-anon-key",
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
