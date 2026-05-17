import type { Filter, HistoryItem } from "@/features/history/types";
import type { ScanStatsResult } from "@/lib/firestore-service";
import { FILTERS, SOCIAL_TYPES, PAYMENT_TYPES, CONTACT_TYPES, UTILITY_TYPES, BUSINESS_TYPES } from "@/features/history/utils/constants";

function countBy(history: HistoryItem[], types: readonly string[]): number {
  return history.filter((i) => (types as string[]).includes(i.contentType)).length;
}

export function getActiveFilters(
  history:   HistoryItem[],
  scanStats: ScanStatsResult | null,
  user:      any
): { key: Filter; label: string; count?: number }[] {
  const base = FILTERS.map((f) => {
    let count = 0;
    switch (f.key) {
      case "all":      count = scanStats?.total ?? history.length; break;
      case "url":      count = history.filter((i) => i.contentType === "url").length; break;
      case "social":   count = countBy(history, SOCIAL_TYPES); break;
      case "payment":  count = countBy(history, PAYMENT_TYPES); break;
      case "contact":  count = countBy(history, CONTACT_TYPES); break;
      case "wifi":     count = history.filter((i) => i.contentType === "wifi").length; break;
      case "location": count = history.filter((i) => i.contentType === "location").length; break;
      case "utility":  count = countBy(history, UTILITY_TYPES); break;
      case "business": count = countBy(history, BUSINESS_TYPES); break;
      case "text":     count = history.filter((i) => i.contentType === "text").length; break;
      default:         count = 0;
    }
    return { ...f, count };
  });

  if (user) base.push({ key: "favorites" as Filter, label: "Favorites", count: 0 });
  return base;
}
