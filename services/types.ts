export interface QrCodeData {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  // Fraud-guard fields
  scanCountFrozen?: boolean;
  scanCountFreezeReason?: string;
}

export interface UserData {
  id: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  photoURL: string | null;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  totalLikesReceived: number;
  username?: string;
  usernameLastChangedAt?: string;
}

export interface ScanRecord {
  id: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  scannedAt: string;
  isAnonymous: boolean;
  scanSource?: "camera" | "gallery" | "viewed";
}

export interface CommentData {
  id: string;
  qrCodeId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
}

export interface ReportData {
  id: string;
  qrCodeId: string;
  userId: string;
  reportType: string;
  description: string;
  createdAt: string;
  weight: number;
}

export type NotificationType =
  | "new_comment"
  | "owner_comment"
  | "comment_reply"
  | "mention"
  | string;

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  qrCodeId?: string;
  fromUsername?: string;
  read: boolean;
  createdAt: number;
}

export interface NotificationData {
  id: string;
  userId: string;
  type: string;
  message: string;
  qrCodeId?: string;
  fromUsername?: string;
  read: boolean;
  createdAt: string;
}

// Trust Score types
export type { TrustScore, TrustFactor } from "./trust/trust-service";

// User Stats types
export interface UserStats {
  totalScans?: number;
  totalComments?: number;
  totalLikes?: number;
  totalQrsCreated?: number;
  accountAge?: number;
  reputationScore?: number;
  scanCount?: number;
  commentCount?: number;
  totalLikesReceived?: number;
}

export interface UsernameData {
  username: string | null;
  userId: string;
  claimedAt: string;
  lastChangedAt?: string;
  usernameLastChangedAt?: Date | string | null;
  isVerified?: boolean;
}

// Comment Service types
export interface CommentItem {
  id: string;
  qrCodeId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  text?: string;
  createdAt?: string;
  updatedAt?: string;
  likes?: number;
  likedBy?: string[];
  replies?: CommentItem[];
  parentId?: string | null;
  isEdited?: boolean;
  isPinned?: boolean;
  reports?: number;
  user?: { displayName: string; [key: string]: any };
  userUsername?: string;
  [key: string]: any;
}

// Additional utility types
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
  hitCount: number;
}
