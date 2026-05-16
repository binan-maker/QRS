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

export function groupByDate(items: HistoryItem[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastLabel = "";

  for (let i = 0; i < items.length; i++) {
    const item  = items[i];
    const label = getDateLabel(new Date(item.scannedAt));

    if (label !== lastLabel) {
      const count = items
        .slice(i)
        .filter((it) => getDateLabel(new Date(it.scannedAt)) === label).length;
      rows.push({ kind: "header", label, count, id: `header-${label}` });
      lastLabel = label;
    }
    rows.push({ kind: "item", item });
  }
  return rows;
}
