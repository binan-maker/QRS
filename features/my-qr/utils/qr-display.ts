/**
 * My QR display helpers — now delegates to the centralized QR engine.
 *
 * getEffectiveContentType: resolves the best displayable type for a GeneratedQrItem,
 *   preferring templateKey > stored contentType > live detection.
 *
 * getDisplayText: human label for a list row (label > businessName > engine display label).
 *
 * extractSocialHandle: util kept here for any direct callers.
 */
import type { GeneratedQrItem } from "@/services/generator";
import { detectContentType, getDisplayLabel, resolveEffectiveType } from "@/features/qr-engine";
export { getQrTypeMeta as getContentTypeMeta } from "@/features/qr-engine";

const GENERIC_CT = new Set(["text", "url", "link", "biolink", "social"]);

export function getEffectiveContentType(item: GeneratedQrItem): string {
  const stored  = (item as any).contentType as string | undefined || "text";
  const tmplKey = (item as any).templateKey as string | undefined;
  // Engine resolves templateKey preference
  if (tmplKey && !GENERIC_CT.has(tmplKey)) return tmplKey;
  if (stored  && !GENERIC_CT.has(stored))  return stored;

  const displayDest = (item as any).displayDestination as string | null;
  const content     = item.content || "";
  const src         = displayDest || content;
  if (!src) return stored;

  const detected = detectContentType(src);
  if (detected !== "text") return detected;
  return stored;
}

export function extractSocialHandle(url: string, prefix = "@"): string | null {
  try {
    const u     = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    const last  = parts[parts.length - 1] || "";
    if (last && !last.includes(".") && last.length > 0)
      return prefix + last.replace(/^@/, "");
  } catch {}
  return null;
}

export function getDisplayText(item: GeneratedQrItem, index: number): string {
  if (item.label?.trim())        return item.label.trim();
  if (item.businessName?.trim()) return item.businessName.trim();

  const ct      = getEffectiveContentType(item);
  const content = (item as any).displayDestination || item.content || "";

  return getDisplayLabel(content, ct);
}
