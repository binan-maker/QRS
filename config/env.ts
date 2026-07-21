// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT — typed, validated env access for the mobile app.
// ───────────────────────────────────────────────────────────────────────────────
// Source of truth: packages/config/src/env.ts (schema definitions)
// This file consumes the schema and exports concrete, typed values.
//
// All values come from process.env at bundle time (EXPO_PUBLIC_* vars).
// None of these are secrets — they are visible in the JS bundle.
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
// Direct, validated access to env vars — avoids `process.env.EXPO_PUBLIC_*`
// scattered inline throughout the codebase.

export const ENV = {
  /** Firebase API key. */
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  /** Firebase project ID. */
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  /** Firebase Storage bucket. */
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  /** Firebase Realtime Database URL. */
  FIREBASE_DATABASE_URL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  /** Firebase app ID. */
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  /** Firebase messaging sender ID. */
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",

  /** Google Sign-In web client ID (used for ID token auth). */
  GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",

  /**
   * The deployed API domain (e.g. "myapp.replit.dev").
   * May include a port suffix ("host:port") — use config/api.ts helpers.
   * Undefined when running locally without a deployment.
   */
  DOMAIN: process.env.EXPO_PUBLIC_DOMAIN,

  /** reCAPTCHA v3 site key for Firebase App Check (web only). */
  RECAPTCHA_SITE_KEY: process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY,
} as const;
