import type { FilterKey, ActiveFilters, HistoryItem } from "@/features/history/types";
import type { ScanStatsResult } from "@/lib/firestore-service";
import {
  FILTERS,
  PAYMENT_TYPES,
  CONTACT_TYPES,
  ALL_KNOWN_TYPES,
} from "@/features/history/utils/constants";

function countBy(history: HistoryItem[], types: readonly string[]): number {
  return history.filter((i) => (types as string[]).includes(i.contentType)).length;
}

function countOthers(history: HistoryItem[]): number {
  return history.filter((i) => !ALL_KNOWN_TYPES.has(i.contentType)).length;
}

export function getActiveFilters(
  history:   HistoryItem[],
  scanStats: ScanStatsResult | null,
  user:      any
): { key: FilterKey; label: string; count: number }[] {
  const base = FILTERS.map((f) => {
    let count = 0;
    switch (f.key) {
      case "all":     count = scanStats?.total ?? history.length; break;
      case "payment": count = countBy(history, PAYMENT_TYPES); break;
      case "url":     count = history.filter((i) => i.contentType === "url").length; break;
      case "contact": count = countBy(history, CONTACT_TYPES); break;
      case "wifi":    count = history.filter((i) => i.contentType === "wifi").length; break;
      case "others":  count = countOthers(history); break;
      default:        count = 0;
    }
    return { ...f, count };
  });

  if (user) base.push({ key: "favorites" as FilterKey, label: "Favorites", count: 0 });
  return base;
}

/**
 * Returns true if the given contentType matches ANY of the active filter keys.
 * "all" and "favorites" are handled upstream (not here).
 */
export function itemMatchesFilters(
  contentType: string,
  activeFilters: ActiveFilters
): boolean {
  for (const key of activeFilters) {
    switch (key) {
      case "url":     if (contentType === "url") return true; break;
      case "wifi":    if (contentType === "wifi") return true; break;
      case "payment": if ((PAYMENT_TYPES as readonly string[]).includes(contentType)) return true; break;
      case "contact": if ((CONTACT_TYPES as readonly string[]).includes(contentType)) return true; break;
      case "others":  if (!ALL_KNOWN_TYPES.has(contentType)) return true; break;
    }
  }
  return false;
}

/**
 * Toggle a filter key in an ActiveFilters array following these rules:
 *
 *  • "all"       → always exclusive; clears everything else
 *  • "favorites" → exclusive; clears everything else
 *  • any other   → multi-select; deselects "all" automatically
 *                  if it was the only active key, revert to ["all"]
 */
export function toggleFilter(
  current: ActiveFilters,
  tapped:  FilterKey
): ActiveFilters {
  if (tapped === "all") return ["all"];

  if (tapped === "favorites") {
    if (current.includes("favorites")) return ["all"];
    return ["favorites"];
  }

  const withoutAll = current.filter((k) => k !== "all" && k !== "favorites");

  if (withoutAll.includes(tapped)) {
    const next = withoutAll.filter((k) => k !== tapped);
    return next.length === 0 ? ["all"] : next;
  }

  return [...withoutAll, tapped];
}
