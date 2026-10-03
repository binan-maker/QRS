// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES — Master Barrel Export
// ───────────────────────────────────────────────────────────────────────────────
// Reusable pure utility functions for formatting, validation, navigation,
// haptics, platform detection, and QR payload handling.
// ═══════════════════════════════════════════════════════════════════════════════

export * from "./formatters";
export * from "./haptics";
export * from "./platform";
export * from "./navigation";
export * from "./responsive";
export * from "./smart-open";
export {
  type QrTypeDefinition,
  QR_CONTENT_TYPES,
  getQrTypeMeta,
  getDisplayLabel,
  getSubtitle,
  resolveEffectiveType,
  useQrMeta,
} from "./qr-content";
export * from "./qr-share";
export * from "./url-risk";
export * from "./disposable-domains";
export * from "./email-validator";
