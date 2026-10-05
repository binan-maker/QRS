/**
 * Shared QR content formatting helpers.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  detectContentType as _detect,
  getDisplayLabel as _label,
  getSubtitle as _subtitle,
  getQrTypeMeta,
} from "../qr-content";

export type { QrTypeDefinition as ContentTypeMeta } from "../qr-content";

export { getQrTypeMeta as getContentTypeMeta } from "../qr-content";

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
