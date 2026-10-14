import type { HistoryItem } from "@/features/history/types";
import { parseAnyPaymentQr } from "@/services/analysis";

/**
 * Extract searchable text tokens from a HistoryItem.
 * Normalizes URL hostnames and parses payment details (recipient name, VPA, ID)
 * once per item.
 */
export function extractSearchTokens(item: HistoryItem): string {
  const parts: string[] = [
    item.content.toLowerCase(),
    item.contentType.toLowerCase(),
  ];

  if (item.contentType === "url") {
    try {
      const host = new URL(item.content).hostname.replace("www.", "");
      parts.push(host.toLowerCase());
    } catch {}
  }

  const isPayment =
    item.contentType === "payment" ||
    item.content.toLowerCase().startsWith("upi://");

  if (isPayment) {
    try {
      const parsed = parseAnyPaymentQr(item.content);
      if (parsed?.recipientName) parts.push(parsed.recipientName.toLowerCase());
      if (parsed?.vpa)           parts.push(parsed.vpa.toLowerCase());
      if (parsed?.recipientId)   parts.push(parsed.recipientId.toLowerCase());
    } catch {}
  }

  return parts.join(" ");
}

/**
 * Full (per-query) search — used as a fallback or for single items.
 * For list filtering prefer matchesSearchIndexed + buildSearchIndex
 * to avoid calling extractSearchTokens on every keystroke.
 */
export function matchesSearch(item: HistoryItem, q: string): boolean {
  const lower = q.toLowerCase().trim();
  if (!lower) return true;

  const fullText = extractSearchTokens(item);
  const words = lower.split(/\s+/).filter(Boolean);
  return words.every((w) => fullText.includes(w));
}

/**
 * Build a precomputed search index: Map<itemId, lowercased searchable text>.
 *
 * Call this once when displayItems changes (via useMemo). The token extraction
 * is paid at index-build time, NOT on every keystroke, so repeated searches
 * across the same list are O(n) word checks instead of O(n × token parsing).
 */
export function buildSearchIndex(items: HistoryItem[]): Map<string, string> {
  const index = new Map<string, string>();
  for (let i = 0; i < items.length; i++) {
    index.set(items[i].id, extractSearchTokens(items[i]));
  }
  return index;
}

/**
 * Check if an item matches a query using the precomputed index.
 * Matches all words in any order for fluid, intuitive search.
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
  if (text !== undefined) {
    const words = lower.split(/\s+/).filter(Boolean);
    return words.every((w) => text.includes(w));
  }
  return matchesSearch(item, q); // fallback
}
