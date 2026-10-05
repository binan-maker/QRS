// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT — typed, validated env access for the mobile app.
// ───────────────────────────────────────────────────────────────────────────────
// All values come from EXPO_PUBLIC_* vars bundled at build time.
// ═══════════════════════════════════════════════════════════════════════════════

// Standalone environment types for use across the monorepo.
export interface MobileEnv {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
  EXPO_PUBLIC_ANDROID_CLIENT_ID?: string;
  EXPO_PUBLIC_IOS_CLIENT_ID?: string;
  EXPO_PUBLIC_DOMAIN?: string;
}

export interface ApiEnv {
  PORT?: number;
  NODE_ENV?: "development" | "production" | "test";
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_DATABASE_URL?: string;
  SESSION_SECRET?: string;
  OPENAI_API_KEY?: string;
}

// ── Typed environment access (mobile) ─────────────────────────────────────────

export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",

  /** Google Sign-In web client ID (used for ID token auth). */
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  /** Google Sign-In Android client ID. */
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ?? "",
  /** Google Sign-In iOS client ID. */
  GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_IOS_CLIENT_ID ?? "",

  /**
   * The deployed API domain (e.g. "myapp.replit.dev").
   * May include a port suffix ("host:port") — use config/api.ts helpers.
   */
  DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,
} as const;
