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
  | "url"
  | "text"
  | "social"
  | "payment"
  | "contact"
  | "wifi"
  | "location"
  | "utility"
  | "business"
  | "others"
  | "favorites";

/** @deprecated use FilterKey */
export type Filter = FilterKey;

/** The active filter state is always an array of FilterKey values. */
export type ActiveFilters = FilterKey[];

export type RiskLevel = "safe" | "caution" | "dangerous";

export type ListRow =
  | { kind: "header"; label: string; count: number; id: string }
  | { kind: "item"; item: HistoryItem };
