import type { AppColors } from "@/shared/constants/colors";

export {
  type ReportKey,
  type ReportType,
} from "../types";

export {
  REPORT_TYPES,
  RATE_TYPES,
} from "../constants";

export function getContentTypeColor(type: string, colors: AppColors): string {
  if (type === "safe") return colors.safe;
  if (type === "warning") return colors.warning;
  if (type === "danger") return colors.danger;
  return colors.primary;
}
