/**
 * @binro/ui — Colour design tokens
 *
 * Single source of truth for the BinRo colour system.
 * Used by:
 *   - Tailwind CSS config (apps/web/tailwind.config.ts)
 *   - React Native StyleSheet (apps/mobile — Phase 4)
 *
 * All values are raw hex strings — no framework dependency.
 */

export const colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brand: {
    50:  "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },

  // ── Trust verdicts ────────────────────────────────────────────────────────
  safe:    { DEFAULT: "#22c55e", muted: "#dcfce7", dark: "#15803d" },
  caution: { DEFAULT: "#f59e0b", muted: "#fef3c7", dark: "#b45309" },
  flagged: { DEFAULT: "#ef4444", muted: "#fee2e2", dark: "#b91c1c" },
  unknown: { DEFAULT: "#6b7280", muted: "#f3f4f6", dark: "#374151" },

  // ── Neutrals ──────────────────────────────────────────────────────────────
  gray: {
    50:  "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },

  // ── Semantic ──────────────────────────────────────────────────────────────
  white:       "#ffffff",
  black:       "#000000",
  transparent: "transparent",
} as const;

export type ColorToken = typeof colors;
