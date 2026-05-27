/**
 * COMPATIBILITY SHIM — all metadata lives in @/features/qr-engine/registry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Do NOT add any data here. Edit the central registry instead.
 */
export type {
  QrTypeDefinition as ContentTypeMeta,
  QrTypeMeta,
} from "@/features/qr-engine";

export {
  getQrTypeMeta as getContentTypeMeta,
  getQrTypeDef,
  QR_REGISTRY as CONTENT_TYPE_META,
} from "@/features/qr-engine";

export const DEFAULT_CONTENT_TYPE_META = {
  label: "QR Code", icon: "qr-code-outline", color: "#6B7280", bg: "#F9FAFB",
} as const;
