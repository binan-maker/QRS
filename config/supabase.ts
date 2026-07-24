// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIGURATION — single source of truth for Supabase project metadata.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces config/firebase.ts.
// All client-side values are sourced from EXPO_PUBLIC_* environment variables
// and are safe to include in the JS bundle.
// ═══════════════════════════════════════════════════════════════════════════════

export const SUPABASE_CONFIG = {
  /** Supabase project URL — e.g. https://xxxx.supabase.co */
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  /** Supabase anon/public key — safe to expose in the bundle. */
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
