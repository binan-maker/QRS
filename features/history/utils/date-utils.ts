import type { HistoryItem, ListRow } from "@/features/history/types";

/**
 * Return a human-readable date label for a timestamp (ms).
 * today/yesterdayMs are pre-computed by the caller to avoid recreating Date
 * objects per item — pass the values from groupByDate.
 */
function getDateLabelFast(ts: number, todayMs: number, yesterdayMs: number): string {
  // Truncate the item's timestamp to midnight, same timezone offset as caller.
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dayMs = d.getTime();
  if (dayMs === todayMs)     return "Today";
  if (dayMs === yesterdayMs) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Group a sorted (newest-first) list of HistoryItems into ListRows with
 * section headers.
 *
 * Perf improvements over the previous implementation:
 *  - Today / yesterday boundaries computed once (not per item).
 *  - Labels cached in a pre-allocated array so getDateLabelFast is called
 *    once per item instead of twice (previously two separate passes both
 *    called getDateLabel, each creating 4 Date objects per call).
 *  - Output array pre-sized to its upper bound, then trimmed.
 */
export function groupByDate(items: HistoryItem[]): ListRow[] {
  if (items.length === 0) return [];

  // Compute today/yesterday boundaries once for the entire list.
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayMs     = todayDate.getTime();
  const yesterdayMs = todayMs - 86_400_000;

  // Pass 1: compute and cache each item's label + count per label.
  const labels   = new Array<string>(items.length);
  const countMap = new Map<string, number>();

  for (let i = 0; i < items.length; i++) {
    const label = getDateLabelFast(Date.parse(items[i].scannedAt), todayMs, yesterdayMs);
    labels[i] = label;
    countMap.set(label, (countMap.get(label) ?? 0) + 1);
  }

  // Pass 2: build rows using cached labels — no extra Date allocations.
  // Upper-bound size = items + one header per distinct date.
  const rows = new Array<ListRow>(items.length + countMap.size);
  let rowIdx    = 0;
  let lastLabel = "";

  for (let i = 0; i < items.length; i++) {
    const label = labels[i];
    if (label !== lastLabel) {
      rows[rowIdx++] = { kind: "header", label, count: countMap.get(label) ?? 0, id: `header-${label}` };
      lastLabel = label;
    }
    rows[rowIdx++] = { kind: "item", item: items[i] };
  }

  rows.length = rowIdx; // trim to actual used size
  return rows;
}
