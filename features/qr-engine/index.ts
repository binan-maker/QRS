/**
 * QR ENGINE — PUBLIC API
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything exported from ONE place.
 * Import from "@/features/qr-engine" — never from sub-modules directly.
 *
 * Example:
 *   import {
 *     QrRenderer, QrCard,
 *     QrTypeIcon, useQrMeta,
 *     getQrTypeDef, getDisplayLabel, detectContentType,
 *     smartOpen, computeTrustScore,
 *   } from "@/features/qr-engine";
 */

// ── Universal renderer ────────────────────────────────────────────────────────
export { default as QrRenderer } from "./renderers/QrRenderer";

// ── Universal card system ─────────────────────────────────────────────────────
export { QrCard } from "./cards";

// ── Visual atoms ──────────────────────────────────────────────────────────────
export { QrTypeIcon, QrTypeBadge } from "./renderers/HistoryRenderer";
export { default as MinimalRenderer } from "./renderers/MinimalRenderer";
export { default as FeedRenderer } from "./renderers/FeedRenderer";
export { default as HeroRenderer } from "./renderers/HeroRenderer";

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

// ── Trust engine ──────────────────────────────────────────────────────────────
export {
  computeTrustScore,
  scoreToLevel,
  trustLevelColor,
  trustLevelLabel,
  trustLevelIcon,
} from "./trust";

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useQrMeta } from "./hooks/useQrMeta";

// ── Actions ───────────────────────────────────────────────────────────────────
export { smartOpen, smartCopy, getQrActions } from "./actions";
export type { QrAction } from "./actions";

// ── Payment card (centralized) ────────────────────────────────────────────────
export { PaymentCard, PaymentCardFace, PaymentCardActions, getAppBrand } from "./payment";
export type { AppBrand } from "./payment";
export { getBankFullName, formatAmount, addSoftHyphens } from "./payment";

// ── Content cards (centralized) ───────────────────────────────────────────────
export { ContentCard } from "./content-cards";
export {
  WebsiteCard, WifiCard, ContactCard, EmailCard, SmsCard, WhatsAppCard,
  PhoneCard, LocationCard, CryptoCard, EventCard, EncryptedCard, TextCard,
  OtpCard,
} from "./content-cards";
export { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "./content-cards";

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
  QrTrustSummary,
  TrustLevel,
  TrustFlag,
} from "./types";
