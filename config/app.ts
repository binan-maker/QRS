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

// ── URL patterns ──────────────────────────────────────────────────────────────

/**
 * Ensure a URL string has an https:// or http:// scheme.
 * This duplicated inline across 4+ files — centralized here.
 *
 * @example
 *   ensureProtocol("example.com")         // → "https://example.com"
 *   ensureProtocol("http://example.com")  // → "http://example.com"
 */
export function ensureProtocol(url: string): string {
  if (!url) return url;
  return url.startsWith("http") ? url : `https://${url}`;
}

// ── Third-party deep link bases ───────────────────────────────────────────────
// These appear hardcoded in StandardLinkCard.tsx and registry.ts.
// Centralizing them makes it easy to swap or audit.

export const EXTERNAL = {
  /** WhatsApp message link base */
  WHATSAPP: "https://wa.me/",
  /** Zoom meeting link base */
  ZOOM: "https://zoom.us/j/",
  /** Calendly scheduling link base */
  CALENDLY: "https://calendly.com/",
  /** Google Maps query link base */
  GOOGLE_MAPS: "https://maps.google.com/?q=",
  /** Google Calendar new event link base */
  GOOGLE_CALENDAR: "https://calendar.google.com/calendar/r/eventedit",
} as const;

// ── Timeouts and limits ───────────────────────────────────────────────────────

/** Default network request timeout in milliseconds. */
export const REQUEST_TIMEOUT_MS = 8_000;

/** Maximum time (ms) to wait for the realtime DB before giving up. */
export const RTDB_TIMEOUT_MS = 5_000;
