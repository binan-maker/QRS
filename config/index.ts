// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION (ROOT BARREL)
// ───────────────────────────────────────────────────────────────────────────────
// Single entry point for all configuration across the application.
// Re-exports environment variables, API endpoints, app constants, and external URLs.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Environment ──────────────────────────────────────────────────────────────
export {
  ENV,
  mobileEnvSchema,
  apiEnvSchema,
  validateEnv,
  type MobileEnv,
  type ApiEnv,
} from "./env";

// ── Supabase Configuration ───────────────────────────────────────────────────
export { SUPABASE_CONFIG } from "./supabase";

// ── API & Networking ─────────────────────────────────────────────────────────
export {
  API_BASE_URL,
  apiUrl,
  JSON_HEADERS,
  authHeaders,
} from "./api";

// ── Application Constants ────────────────────────────────────────────────────
export {
  APP_NAME,
  DEFAULT_QR_URL,
  PRODUCT_WEBSITE,
  REQUEST_TIMEOUT_MS,
  RTDB_TIMEOUT_MS,
} from "./app";

// ── External Service URLs ────────────────────────────────────────────────────
export const EXTERNAL = {
  GOOGLE_MAPS: "https://www.google.com/maps/search/?api=1&query=",
  GOOGLE_CALENDAR: "https://calendar.google.com/calendar/render?action=TEMPLATE",
} as const;
