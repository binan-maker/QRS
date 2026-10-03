import type { AppColors } from "@/shared/constants/colors";

export type QrDetailContentType = "url" | "text" | "payment";

export function normalizeQrDetailContentType(contentType?: string | null): QrDetailContentType {
  const lower = contentType?.toLowerCase()?.trim();
  if (lower === "url") return "url";
  if (
    lower === "payment" ||
    lower === "upi" ||
    lower === "paypal" ||
    lower === "gpay" ||
    lower === "phonepe" ||
    lower === "paytm" ||
    lower === "crypto" ||
    lower === "paymentlink"
  ) {
    return "payment";
  }
  return "text";
}

export interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userLike: "like" | "dislike" | null;
  user: { displayName: string };
  parentId?: string | null;
  userId?: string;
  isDeleted?: boolean;
  reportCount?: number;
  userUsername?: string;
  userPhotoURL?: string;
}

export type ReportKey = "safe" | "scam" | "fake" | "spam";

export interface ReportType {
  key: ReportKey;
  label: string;
  icon: string;
  outlineIcon: string;
  color: (c: AppColors) => string;
  bg: (c: AppColors) => string;
}
