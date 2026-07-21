import type { HistoryItem } from "@/features/history/types";
import { parseAnyPaymentQr } from "@/services/analysis";

/**
 * Full (per-query) search — used as a fallback or for single items.
 * For list filtering prefer matchesSearchIndexed + buildSearchIndex
 * to avoid calling parseAnyPaymentQr on every keystroke.
 */
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

/**
 * Build a precomputed search index: Map<itemId, lowercased searchable text>.
 *
 * Call this once when displayItems changes (via useMemo).  The expensive
 * parseAnyPaymentQr call is paid at index-build time, NOT on every keystroke,
 * so repeated searches across the same list are O(n) string.includes instead
 * of O(n × parseAnyPaymentQr).
 *
 * For a 200-item list with 40 payment entries and 10 keystrokes, this reduces
 * parseAnyPaymentQr calls from 400 → 40.
 */
export function buildSearchIndex(items: HistoryItem[]): Map<string, string> {
  const index = new Map<string, string>();
  for (let i = 0; i < items.length; i++) {
    const item  = items[i];
    const parts: string[] = [
      item.content.toLowerCase(),
      item.contentType.toLowerCase(),
    ];

    if (item.contentType === "url") {
      try {
        parts.push(new URL(item.content).hostname.replace("www.", "").toLowerCase());
      } catch {}
    }

    if (item.contentType === "payment") {
      try {
        const parsed = parseAnyPaymentQr(item.content);
        if (parsed?.recipientName) parts.push(parsed.recipientName.toLowerCase());
        if (parsed?.vpa)           parts.push(parsed.vpa.toLowerCase());
        if (parsed?.recipientId)   parts.push(parsed.recipientId.toLowerCase());
      } catch {}
    }

    index.set(item.id, parts.join(" "));
  }
  return index;
}

/**
 * Check if an item matches a query using the precomputed index.
 * Falls back to matchesSearch for items not present in the index.
 */
export function matchesSearchIndexed(
  item:  HistoryItem,
  index: Map<string, string>,
  q:     string,
): boolean {
  const lower = q.toLowerCase().trim();
  if (!lower) return true;
  const text = index.get(item.id);
  if (text !== undefined) return text.includes(lower);
  return matchesSearch(item, q); // fallback (shouldn't normally happen)
}
