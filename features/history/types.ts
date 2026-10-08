export interface HistoryItem {
  id:          string;
  content:     string;
  contentType: string;
  scannedAt:   string;
  qrCodeId?:   string;
  source:      "local" | "cloud";
}

export type ListRow =
  | { kind: "header"; label: string; count: number; id: string }
  | { kind: "item"; item: HistoryItem };
