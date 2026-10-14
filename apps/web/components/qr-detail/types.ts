import type { IoniconName } from "@/lib/mobile-icons";
import type { ReportKey } from "@shared/utils/qr-detail-rules";
import type { AppColors } from "@shared/constants/colors";
import Colors from "@shared/constants/colors";
import {
  REPORT_TYPES as MOBILE_REPORT_TYPES,
  RATE_TYPES as MOBILE_RATE_TYPES,
  REPORT_LABELS,
  REPORT_ICONS as MOBILE_REPORT_ICONS,
} from "@shared/utils/qr-detail-rules";

export type { ReportKey };
export { REPORT_LABELS };

export interface ReportTypeConfig {
  key: ReportKey;
  label: string;
  icon: IoniconName;
  outlineIcon: IoniconName;
  color: string;
  bg: string;
  borderColor: string;
}

export function getResolvedReportTypes(c: AppColors): ReportTypeConfig[] {
  return MOBILE_REPORT_TYPES.map((rt) => {
    const resolvedColor = rt.color(c);
    const resolvedBg =
      rt.key === "safe"
        ? c.safeDim
        : rt.key === "scam"
          ? c.dangerDim
          : rt.key === "fake"
            ? c.warningDim
            : c.primaryDim;
    return {
      key: rt.key as ReportKey,
      label: rt.label,
      icon: rt.icon as IoniconName,
      outlineIcon: rt.outlineIcon as IoniconName,
      color: resolvedColor,
      bg: resolvedBg,
      borderColor: `${resolvedColor}50`,
    };
  });
}

export function getResolvedRateTypes(c: AppColors): ReportTypeConfig[] {
  return MOBILE_RATE_TYPES.map((rt) => {
    const resolvedColor = rt.color(c);
    const resolvedBg =
      rt.key === "safe"
        ? c.safeDim
        : rt.key === "scam"
          ? c.dangerDim
          : rt.key === "fake"
            ? c.warningDim
            : c.primaryDim;
    return {
      key: rt.key as ReportKey,
      label: rt.label,
      icon: rt.icon as IoniconName,
      outlineIcon: rt.outlineIcon as IoniconName,
      color: resolvedColor,
      bg: resolvedBg,
      borderColor: `${resolvedColor}50`,
    };
  });
}

export const REPORT_TYPES = getResolvedReportTypes(Colors.light);
export const RATE_TYPES = getResolvedRateTypes(Colors.light);
export const REPORT_ICONS: Record<string, IoniconName> = MOBILE_REPORT_ICONS as Record<string, IoniconName>;

export interface CommentSortOption {
  id: "top" | "newest" | "oldest";
  label: string;
  icon: IoniconName;
}

export const COMMENT_SORT_OPTIONS: CommentSortOption[] = [
  { id: "top", label: "Top", icon: "flame-outline" },
  { id: "newest", label: "Newest", icon: "time-outline" },
  { id: "oldest", label: "Oldest", icon: "arrow-up-circle-outline" },
];

export interface ReplyTarget {
  id: string;
  author: string;
  rootId: string;
  isNested: boolean;
}
