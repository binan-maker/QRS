import type { Filter, HistoryItem } from "@/features/history/types";
import type { ScanStatsResult } from "@/lib/firestore-service";
import { FILTERS } from "@/features/history/utils/constants";

export function getActiveFilters(
  history:   HistoryItem[],
  scanStats: ScanStatsResult | null,
  user:      any
): { key: Filter; label: string; count?: number }[] {
  const base = FILTERS.map((f) => {
    let count = 0;
    if (f.key === "all")          count = scanStats?.total    ?? history.length;
    else if (f.key === "url")     count = scanStats?.byUrl    ?? history.filter((i) => i.contentType === "url").length;
    else if (f.key === "payment") count = scanStats?.byPayment ?? history.filter((i) => i.contentType === "payment").length;
    else if (f.key === "text")    count = scanStats?.byText   ?? history.filter((i) => i.contentType === "text").length;
    else                          count = scanStats?.byOther  ?? history.filter((i) => !["url", "text", "payment"].includes(i.contentType)).length;
    return { ...f, count };
  });
  if (user) base.push({ key: "favorites" as Filter, label: "Favorites" });
  return base;
}
