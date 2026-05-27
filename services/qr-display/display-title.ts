/**
 * SHIM — display title for My QR detail screen.
 * Delegates to the centralized QR engine. Do NOT add label logic here.
 */
import { getDisplayLabel } from "@/features/qr-engine";
import { getDetailContentType } from "./type-detection";

export function getDetailDisplayTitle(item: any): string {
  const contentType = getDetailContentType(item);
  const src = (item.displayDestination as string | null) || (item.content as string) || "";
  return getDisplayLabel(src, contentType);
}
