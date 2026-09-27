import type { Ionicons } from "@expo/vector-icons";
import type { ReportType } from "./types";

export const COMMENTS_PER_PAGE = 20;
export const REPLIES_PER_PAGE = 10;

export const REPORT_TYPES: ReportType[] = [
  {
    key: "safe",
    label: "Safe",
    icon: "shield-checkmark",
    outlineIcon: "shield-checkmark-outline",
    color: (c) => c.safe,
    bg: (c) => c.safeDim,
  },
  {
    key: "scam",
    label: "Scam",
    icon: "warning",
    outlineIcon: "warning-outline",
    color: (c) => c.danger,
    bg: (c) => c.dangerDim,
  },
  {
    key: "fake",
    label: "Fake",
    icon: "close-circle",
    outlineIcon: "close-circle-outline",
    color: (c) => c.warning,
    bg: (c) => c.warningDim,
  },
  {
    key: "spam",
    label: "Spam",
    icon: "mail-unread",
    outlineIcon: "mail-unread-outline",
    color: (c) => c.primary,
    bg: (c) => c.primaryDim,
  },
];

export const RATE_TYPES = REPORT_TYPES.filter((r) => r.key !== "fake");

export const REPORT_LABELS: Record<string, string> = {
  safe: "Safe",
  scam: "Scam",
  fake: "Fake",
  spam: "Spam",
};

export const REPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  safe: "shield-checkmark",
  scam: "warning",
  fake: "close-circle",
  spam: "mail-unread",
};
