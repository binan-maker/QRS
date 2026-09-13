// ═══════════════════════════════════════════════════════════════════════════════
// APP CONFIGURATION — application-wide constants.
// ───────────────────────────────────────────────────────────────────────────────
// PROBLEM BEING SOLVED:
//   "https://qrguard.app" appeared hardcoded in 4 different feature files.
//   Magic numbers and strings were scattered inline throughout the codebase.
//
// FIX: Single source of truth here. Import from "@/config/app" in all callers.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Brand ─────────────────────────────────────────────────────────────────────

export const APP_NAME = "BinRo";

/**
 * Default fallback URL used as placeholder content for QR preview components
 * and when a QR code's actual destination is not yet resolved.
 */
export const DEFAULT_QR_URL = "https://qrguard.app";

/**
 * External product website (distinct from the API / deployed app URL).
 */
export const PRODUCT_WEBSITE = "https://qrguard.app";

/** Default network request timeout in milliseconds. */
export const REQUEST_TIMEOUT_MS = 8_000;

/** Maximum time (ms) to wait for the realtime DB before giving up. */
export const RTDB_TIMEOUT_MS = 5_000;
