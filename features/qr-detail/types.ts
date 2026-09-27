import type { AppColors } from "@/shared/constants/colors";

export type QrDetailContentType = "url" | "text";

export function normalizeQrDetailContentType(contentType?: string | null): QrDetailContentType {
  if (contentType?.toLowerCase() === "url") return "url";
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
