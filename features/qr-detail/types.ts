export {
  type QrDetailContentType,
  normalizeQrDetailContentType,
  type ReportKey,
  type ReportTypeConfig as ReportType,
} from "@/shared/utils/qr-detail-rules";

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
