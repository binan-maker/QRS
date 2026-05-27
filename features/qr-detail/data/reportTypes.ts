import type { AppColors } from "@/shared/constants/colors";

export type ReportKey = "safe" | "scam" | "fake" | "spam";

export interface ReportType {
  key: ReportKey;
  label: string;
  icon: string;
  outlineIcon: string;
  color: (c: AppColors) => string;
  bg: (c: AppColors) => string;
}

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

export function getContentTypeColor(type: string, colors: AppColors): string {
  if (type === "safe") return colors.safe;
  if (type === "warning") return colors.warning;
  if (type === "danger") return colors.danger;
  return colors.primary;
}
