import type { HistoryItem, ListRow } from "@/features/history/types";

export function getDateLabel(date: Date): string {
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const d         = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime())     return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

// O(n) single-pass grouping — previously had an O(n²) inner filter
// for each section header's count.
export function groupByDate(items: HistoryItem[]): ListRow[] {
  if (items.length === 0) return [];

  // First pass: count items per date label
  const countMap = new Map<string, number>();
  for (const item of items) {
    const label = getDateLabel(new Date(item.scannedAt));
    countMap.set(label, (countMap.get(label) ?? 0) + 1);
  }

  // Second pass: build rows, inserting headers on label change
  const rows: ListRow[] = [];
  let lastLabel = "";

  for (const item of items) {
    const label = getDateLabel(new Date(item.scannedAt));
    if (label !== lastLabel) {
      rows.push({ kind: "header", label, count: countMap.get(label) ?? 0, id: `header-${label}` });
      lastLabel = label;
    }
    rows.push({ kind: "item", item });
  }
  return rows;
}
