// ═══════════════════════════════════════════════════════════════════════════════
// API CONFIGURATION — centralized API URL computation.
// ───────────────────────────────────────────────────────────────────────────────
// PROBLEM BEING SOLVED:
//   Before this file, `BASE_URL` was computed inline in multiple service files,
//   each with slightly different logic. This file provides one canonical
//   computation. All callers import `API_BASE_URL`.
//
// Usage:
//   import { API_BASE_URL, apiUrl } from "@/config/api";
//   const res = await fetch(apiUrl("/api/donation/create-order"), { ... });
// ═══════════════════════════════════════════════════════════════════════════════

import { ENV } from "./env";

// `__DEV__` is true during `expo start` / Metro dev server. It is false in
// production builds. Falls back to NODE_ENV check for Jest / Node contexts.
const IS_DEV: boolean =
  typeof __DEV__ !== "undefined"
    ? Boolean(__DEV__)
    : process.env.NODE_ENV !== "production";

function computeBaseUrl(): string {
  const domain = ENV.DOMAIN;

  if (domain) {
    // EXPO_PUBLIC_DOMAIN may include a port (e.g. "myapp.replit.dev:443").
    // Strip the port — the domain alone is used for HTTPS on standard ports.
    const host = domain.split(":")[0];
    return `https://${host}`;
  }

  // No domain set — running locally in development.
  if (IS_DEV) {
    return "http://localhost:5000";
  }

  // Production with no domain set: return empty string so callers use
  // relative URLs (works when client and API are served from the same origin).
  return "";
}

/**
 * Absolute base URL for all API requests.
 *
 * Examples:
 *   "https://myapp.replit.dev"   — when EXPO_PUBLIC_DOMAIN is set
 *   "http://localhost:5000"      — during local development
 *   ""                           — production same-origin
 */
export const API_BASE_URL: string = computeBaseUrl();

/**
 * Build a full API URL from a path.
 *
 * @example
 *   apiUrl("/api/v1/unified-qr")
 *   // → "https://myapp.replit.dev/api/v1/unified-qr"
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/**
 * Standard headers for JSON API calls.
 */
export const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

/**
 * Standard headers for authenticated JSON API calls.
 * Pass the ID token string obtained from `authAdapter.getCurrentUser()?.getIdToken()`.
 */
export function authHeaders(idToken: string): Record<string, string> {
  return {
    ...JSON_HEADERS,
    Authorization: `Bearer ${idToken}`,
  };
}
