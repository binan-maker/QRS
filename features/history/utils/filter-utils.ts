import type { FilterKey, ActiveFilters, HistoryItem } from "@/features/history/types";
import type { ScanStatsResult } from "@/lib/firestore-service";
import {
  FILTERS,
  PAYMENT_TYPES,
  CONTACT_TYPES,
  ALL_KNOWN_TYPES,
} from "@/features/history/utils/constants";

// Module-level Sets for O(1) type membership checks — built once at module
// load time so individual filter-chip renders never allocate or iterate.
const PAYMENT_SET = new Set<string>(PAYMENT_TYPES);
const CONTACT_SET = new Set<string>(CONTACT_TYPES);

/**
 * Count all filter categories in a single O(n) pass instead of one filter()
 * call per category (previously O(k × n) where k = number of filter keys).
 */
export function getActiveFilters(
  history:   HistoryItem[],
  scanStats: ScanStatsResult | null,
  user:      any
): { key: FilterKey; label: string; count: number }[] {
  let paymentCount = 0;
  let urlCount     = 0;
  let contactCount = 0;
  let wifiCount    = 0;
  let othersCount  = 0;

  for (let i = 0; i < history.length; i++) {
    const ct = history[i].contentType;
    if (ct === "url")             { urlCount++;     continue; }
    if (ct === "wifi")            { wifiCount++;    continue; }
    if (PAYMENT_SET.has(ct))      { paymentCount++; continue; }
    if (CONTACT_SET.has(ct))      { contactCount++; continue; }
    if (!ALL_KNOWN_TYPES.has(ct)) { othersCount++;            }
  }

  const counts: Record<string, number> = {
    all:     scanStats?.total ?? history.length,
    payment: paymentCount,
    url:     urlCount,
    contact: contactCount,
    wifi:    wifiCount,
    others:  othersCount,
  };

  const base = FILTERS.map((f) => ({ ...f, count: counts[f.key] ?? 0 }));
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
      case "url":     if (contentType === "url")            return true; break;
      case "wifi":    if (contentType === "wifi")           return true; break;
      case "payment": if (PAYMENT_SET.has(contentType))     return true; break;
      case "contact": if (CONTACT_SET.has(contentType))     return true; break;
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
