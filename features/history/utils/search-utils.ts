import type { HistoryItem } from "@/features/history/types";
import { parseAnyPaymentQr } from "@/services/analysis";

export function matchesSearch(item: HistoryItem, q: string): boolean {
  const lower = q.toLowerCase().trim();
  if (!lower) return true;

  if (item.content.toLowerCase().includes(lower))     return true;
  if (item.contentType.toLowerCase().includes(lower)) return true;

  if (item.contentType === "url") {
    try {
      const host = new URL(item.content).hostname.replace("www.", "");
      if (host.toLowerCase().includes(lower)) return true;
    } catch {}
  }

  if (item.contentType === "payment") {
    try {
      const parsed = parseAnyPaymentQr(item.content);
      if (parsed?.recipientName?.toLowerCase().includes(lower)) return true;
      if (parsed?.vpa?.toLowerCase().includes(lower))           return true;
      if (parsed?.recipientId?.toLowerCase().includes(lower))   return true;
    } catch {}
  }

  return false;
}
