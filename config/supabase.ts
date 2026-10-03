// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIGURATION — single source of truth for Supabase project metadata.
// ───────────────────────────────────────────────────────────────────────────────
// Supabase project configuration.
// All client-side values are sourced from EXPO_PUBLIC_* environment variables
// and are safe to include in the JS bundle.
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPABASE_CONFIG = {
  /** Supabase project URL — e.g. https://xxxx.supabase.co */
  url:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder.supabase.co",
  /** Supabase anon/public key — safe to expose in the bundle. */
  anonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "placeholder-anon-key",
} as const;
