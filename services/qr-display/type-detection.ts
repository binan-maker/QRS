/**
 * SHIM — type resolution for stored QR items.
 * Resolves stored QR types for display.
 */
import { detectContentType, resolveEffectiveType } from "@/shared/utils/qr-content";

export function getDetailContentType(item: any): string {
  const stored     = (item.contentType  as string) || "text";
  const templateKey = (item.templateKey as string) || undefined;
  const displayDest = item.displayDestination as string | null;
  const content     = (item.content     as string) || "";
  const src         = displayDest || content;

  // Engine resolves templateKey preference over stored type
  const effective = resolveEffectiveType(stored, templateKey);
  if (effective !== stored) return effective;

  // Fall back to live detection from content
  if (src) {
    const detected = detectContentType(src);
    if (detected !== "text") return detected;
  }
  return stored;
}
