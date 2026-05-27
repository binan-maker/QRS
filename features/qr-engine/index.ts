/**
 * QR ENGINE — PUBLIC API
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything exported from ONE place.
 * Import from "@/features/qr-engine" — never from sub-modules directly.
 *
 * Example:
 *   import {
 *     QrRenderer, QrCard, QrAnalyticsCard,
 *     QrTypeIcon, useQrMeta,
 *     getQrTypeDef, getDisplayLabel, detectContentType,
 *     smartOpen, computeTrustScore, buildQrIdentity,
 *     SCHEMA_REGISTRY, getSchemaByKey,
 *   } from "@/features/qr-engine";
 */

// ── Universal renderer ────────────────────────────────────────────────────────
export { default as QrRenderer } from "./renderers/QrRenderer";

// ── Universal card system ─────────────────────────────────────────────────────
export { QrCard, QrAnalyticsCard } from "./cards";

// ── Visual atoms ──────────────────────────────────────────────────────────────
export { QrTypeIcon, QrTypeBadge } from "./renderers/HistoryRenderer";
export { default as MinimalRenderer } from "./renderers/MinimalRenderer";
export { default as CompactRenderer } from "./renderers/CompactRenderer";
export { default as FeedRenderer } from "./renderers/FeedRenderer";
export { default as HeroRenderer } from "./renderers/HeroRenderer";
export { default as AnalyticsRenderer } from "./renderers/AnalyticsRenderer";

// ── Registry (type metadata + display logic) ──────────────────────────────────
export {
  getQrTypeDef,
  getQrTypeMeta,
  getQrTypeStyle,        // backward-compat alias
  getQrTypeCategory,
  resolveEffectiveType,
  getDisplayLabel,
  getSubtitle,
  QR_REGISTRY,
} from "./registry";

// ── Content-type detector ─────────────────────────────────────────────────────
export { detectContentType } from "./detector";

// ── Schema system (generator) ─────────────────────────────────────────────────
export {
  SCHEMA_REGISTRY,
  getSchemaByKey,
  SCHEMA_CATEGORIES,
  urlSchema,
  wifiSchema,
  upiSchema,
  contactSchema,
  emailSchema,
  phoneSchema,
  smsSchema,
  textSchema,
  cryptoSchema,
  eventSchema,
  locationSchema,
  socialSchema,
  whatsappSchema,
} from "./schemas";

// ── Trust engine ──────────────────────────────────────────────────────────────
export {
  computeTrustScore,
  scoreToLevel,
  trustLevelColor,
  trustLevelLabel,
  trustLevelIcon,
  detectPhishingPattern,
  analyzeUrl,
} from "./trust";

// ── Analytics ─────────────────────────────────────────────────────────────────
export {
  buildScanEvent,
  formatScanCount,
  formatLastScanned,
  emptyAnalytics,
  scanGrowthTrend,
  trendIcon,
  trendColor,
} from "./analytics";

// ── Identity builder ──────────────────────────────────────────────────────────
export { buildQrIdentity, refreshQrIdentity } from "./identity";

// ── Identity service (Firestore ↔ QrIdentity) ─────────────────────────────────
export { fromFirestoreDoc, fromScanHistoryItem, toScanUpdatePayload } from "./services";

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
  QrSchema,
  SchemaField,
  SchemaFieldType,
  QrTypeMeta,
  QrMeta,
  QrRenderProps,
  QrTypeCategory,
  QrIdentity,
  QrMetadata,
  QrAnalyticsSummary,
  QrTrustSummary,
  QrScanEvent,
  QrVerification,
  TrustLevel,
  TrustFlag,
} from "./types";
