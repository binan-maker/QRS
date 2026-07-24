// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT — typed, validated env access for the mobile app.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces Firebase-specific env references.
// All values come from EXPO_PUBLIC_* vars bundled at build time.
// ═══════════════════════════════════════════════════════════════════════════════

// Re-export schemas and types for use elsewhere (e.g. the API server).
export {
  mobileEnvSchema,
  apiEnvSchema,
  validateEnv,
  type MobileEnv,
  type ApiEnv,
} from "../packages/config/src/env";

// ── Typed environment access (mobile) ─────────────────────────────────────────

export const ENV = {
  /** Supabase project URL. */
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  /** Supabase anonymous/public key — safe to expose in the JS bundle. */
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
