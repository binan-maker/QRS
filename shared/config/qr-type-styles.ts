/**
 * COMPATIBILITY SHIM — all style data lives in @/features/qr-engine/registry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Do NOT add any data here. Edit the central registry instead.
 */
export type { QrTypeDefinition as QrTypeStyle } from "@/features/qr-engine";

export {
  getQrTypeDef as getQrTypeStyle,
  QR_REGISTRY as QR_TYPE_STYLES,
  getQrTypeDef,
} from "@/features/qr-engine";
