import type { Filter } from "@/features/history/types";

export const SKELETON_COUNT = 8;
export const PAGE_SIZE      = 20;
export const STALE_MS       = 15 * 60 * 1000;

export const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",     label: "All"     },
  { key: "url",     label: "URLs"    },
  { key: "payment", label: "Payment" },
  { key: "text",    label: "Text"    },
  { key: "other",   label: "Other"   },
];
