/**
 * QR Engine — Public API
 *
 * Import everything from here. Do not import from submodules directly.
 *
 * Example:
 *   import { QrRenderer, QrTypeIcon, useQrMeta, getQrTypeMeta, smartOpen } from "@/features/qr-engine";
 */

// Universal renderer
export { default as QrRenderer } from "./renderers/QrRenderer";

// Visual atoms
export { QrTypeIcon, QrTypeBadge } from "./renderers/HistoryRenderer";
export { default as MinimalRenderer } from "./renderers/MinimalRenderer";
export { default as CompactRenderer } from "./renderers/CompactRenderer";

// Registry
export { getQrTypeMeta, getQrTypeCategory, QR_TYPE_REGISTRY } from "./registry";

// Hook
export { useQrMeta } from "./hooks/useQrMeta";

// Actions
export { smartOpen, smartCopy, getQrActions } from "./actions";
export type { QrAction } from "./actions";

// Parsers (re-exported for convenience)
export * from "./parsers";

// Types
export type { QrRenderMode, QrTypeMeta, QrMeta, QrRenderProps, QrTypeCategory } from "./types";
