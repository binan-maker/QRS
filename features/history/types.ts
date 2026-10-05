export interface HistoryItem {
  id:          string;
  content:     string;
  contentType: string;
  scannedAt:   string;
  qrCodeId?:   string;
  source:      "local" | "cloud";
}

export type FilterKey =
  | "all"
  | "payment"
  | "url"
  | "contact"
  | "wifi"
  | "others";

/** The active filter state is always an array of FilterKey values. */
export type ActiveFilters = FilterKey[];

export type ListRow =
  | { kind: "header"; label: string; count: number; id: string }
  | { kind: "item"; item: HistoryItem };
