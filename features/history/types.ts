export interface HistoryItem {
  id:          string;
  content:     string;
  contentType: string;
  scannedAt:   string;
  qrCodeId?:   string;
  source:      "local" | "cloud" | "favorite";
  scanSource?: "camera" | "gallery" | "viewed";
}

export type Filter =
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
  | "favorites"
  | "camera"
  | "gallery";

export type RiskLevel = "safe" | "caution" | "dangerous";

export type ListRow =
  | { kind: "header"; label: string; count: number; id: string }
  | { kind: "item"; item: HistoryItem };
