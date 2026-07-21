export interface HistoryItem {
  id:          string;
  content:     string;
  contentType: string;
  scannedAt:   string;
  qrCodeId?:   string;
  source:      "local" | "cloud" | "favorite";
  scanSource?: "camera" | "gallery" | "viewed";
}

export type FilterKey =
  | "all"
  | "payment"
  | "url"
  | "contact"
  | "wifi"
  | "others"
  | "favorites";

/** The active filter state is always an array of FilterKey values. */
export type ActiveFilters = FilterKey[];

export type RiskLevel = "safe" | "caution" | "dangerous";

export type ListRow =
  | { kind: "header"; label: string; count: number; id: string }
  | { kind: "item"; item: HistoryItem };
