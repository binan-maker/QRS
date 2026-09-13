/**
 * Shared QR content metadata.
 * ─────────────────────────────────────────────────────────────────────────────
 * Keep this metadata limited to the content types supported by the app.
 */
export type {
  QrTypeDefinition as ContentTypeMeta,
} from "@/shared/utils/qr-content";
export type { QrTypeDefinition as QrTypeMeta } from "@/shared/utils/qr-content";

export {
  getQrTypeMeta as getContentTypeMeta,
  getQrTypeMeta as getQrTypeDef,
  QR_CONTENT_TYPES as CONTENT_TYPE_META,
} from "@/shared/utils/qr-content";

export const DEFAULT_CONTENT_TYPE_META = {
  label: "QR Code", icon: "qr-code-outline", color: "#6B7280", bg: "#F9FAFB",
} as const;
