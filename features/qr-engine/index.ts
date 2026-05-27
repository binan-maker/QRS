/**
 * QR ENGINE — PUBLIC API
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything exported from ONE place.
 * Import from "@/features/qr-engine" — never from sub-modules directly.
 *
 * Example:
 *   import {
 *     QrRenderer, QrTypeIcon, useQrMeta,
 *     getQrTypeDef, getDisplayLabel, detectContentType,
 *     smartOpen
 *   } from "@/features/qr-engine";
 */

// ── Universal renderer ────────────────────────────────────────────────────────
export { default as QrRenderer } from "./renderers/QrRenderer";

// ── Visual atoms ──────────────────────────────────────────────────────────────
export { QrTypeIcon, QrTypeBadge } from "./renderers/HistoryRenderer";
export { default as MinimalRenderer } from "./renderers/MinimalRenderer";
export { default as CompactRenderer } from "./renderers/CompactRenderer";

// ── Registry (type metadata + display logic) ──────────────────────────────────
export {
  getQrTypeDef,
  getQrTypeMeta,
  getQrTypeStyle,        // ← backward-compat alias (smart-open, SocialCard)
  getQrTypeCategory,
  resolveEffectiveType,
  getDisplayLabel,
  getSubtitle,
  QR_REGISTRY,
} from "./registry";

// ── Content-type detector ─────────────────────────────────────────────────────
export { detectContentType } from "./detector";

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useQrMeta } from "./hooks/useQrMeta";

// ── Actions ───────────────────────────────────────────────────────────────────
export { smartOpen, smartCopy, getQrActions } from "./actions";
export type { QrAction } from "./actions";

// ── Parsers (re-exported for convenience) ─────────────────────────────────────
export * from "./parsers";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  QrRenderMode,
  QrTypeDefinition,
  QrTypeMeta,
  QrMeta,
  QrRenderProps,
  QrTypeCategory,
} from "./types";
