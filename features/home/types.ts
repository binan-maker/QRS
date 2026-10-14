import type { HistoryItemType } from "@/features/history";

export interface LocalScan extends Omit<HistoryItemType, "source"> {
  source?: "local" | "cloud";
}
