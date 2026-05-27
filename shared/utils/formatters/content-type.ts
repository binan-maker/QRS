/**
 * COMPATIBILITY SHIM — all logic lives in @/features/qr-engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Do NOT add any logic here. Edit the central registry/detector instead.
 */
import {
  detectContentType as _detect,
  getDisplayLabel as _label,
  getSubtitle as _subtitle,
  getQrTypeMeta,
} from "@/features/qr-engine";

export type { QrTypeDefinition as ContentTypeMeta } from "@/features/qr-engine";

export { getQrTypeMeta as getContentTypeMeta } from "@/features/qr-engine";

export function detectContentType(content: string): string {
  return _detect(content);
}

export function getContentTypeIcon(type: string): string {
  return getQrTypeMeta(type).icon;
}

export function getContentDisplayLabel(content: string, contentType?: string): string {
  const ct = contentType || _detect(content);
  return _label(content, ct);
}

export function getContentSubtitle(content: string, contentType?: string): string | null {
  const ct = contentType || _detect(content);
  return _subtitle(content, ct);
}
