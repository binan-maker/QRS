/**
 * TypeScript types mirroring the BinRo Express REST API responses.
 * Keep in sync with apps/api/API.md and apps/api/src/routes/*.
 *
 * Source of truth: the Express routes.
 * When @binro/core fully defines shared domain types these can re-export from there.
 */

// ─── Envelope ─────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
  status: number;
  /** Zod field issues — present when code === "VALIDATION_ERROR" */
  issues?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export type ApiResult<T> =
  | ({ ok: true } & ApiSuccess<T>)
  | ({ ok: false } & ApiError);

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  username: string | null;
  scanCount: number;
  commentCount: number;
  followingCount: number;
  totalLikesReceived: number;
  friendsCount: number;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string | null;
}

export interface PublicUserProfile {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  username: string | null;
  scanCount: number;
  commentCount: number;
  followingCount: number;
  createdAt: string | null;
}

export interface UpdateProfileInput {
  displayName?: string;
  photoUrl?: string | null;
  pushToken?: string | null;
  username?: string;
}

// ─── QR Design ───────────────────────────────────────────────────────────────

export interface QrDesign {
  fgColor: string;
  bgColor: string;
  logoPosition: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  logoUri: string | null;
  label: string | null;
}

export type QrType = "individual" | "business" | "government";
export type UnifiedQrStatus = "active" | "inactive" | "expired" | "limit_reached";

// ─── Unified QRs ──────────────────────────────────────────────────────────────

export interface UnifiedQr {
  id: string;
  ownerId: string;
  ownerName: string;
  qrType: QrType;
  template: string | null;
  title: string | null;
  isDynamic: boolean;
  destination: string;
  rawDestination: string;
  contentType: string;
  businessName: string | null;
  status: UnifiedQrStatus;
  scanCount: number;
  downloads: number;
  shares: number;
  scanLimit: number | null;
  expiryDate: string | null;
  expiryPreset: string | null;
  design: QrDesign;
  formValues: { value: string; extra: Record<string, string> } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateQrInput {
  destination: string;
  rawDestination?: string;
  contentType?: string;
  isDynamic?: boolean;
  qrType?: QrType;
  title?: string | null;
  businessName?: string | null;
  template?: string | null;
  scanLimit?: number | null;
  expiryDate?: string | null;
  expiryPreset?: "24h" | "7d" | "30d" | "90d" | "1y" | null;
  design?: Partial<QrDesign>;
  formValues?: { value: string; extra: Record<string, string> } | null;
}

export interface UpdateQrInput {
  title?: string | null;
  scanLimit?: number | null;
  expiryDate?: string | null;
  expiryPreset?: "24h" | "7d" | "30d" | "90d" | "1y" | null;
  design?: Partial<QrDesign>;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface QrComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  parentId: string | null;
  likes: number;
  isVerifiedOwner: boolean;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "new_comment"
  | "owner_comment"
  | "comment_reply"
  | "mention"
  | "new_follow"
  | "friend_request"
  | "friend_accepted"
  | "friend_declined"
  | "qr_scan"
  | "qr_report"
  | "system"
  | (string & {});

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  qrCodeId: string | null;
  fromUsername: string | null;
  isRead: boolean;
  createdAt: string | null;
}

// ─── Scans ────────────────────────────────────────────────────────────────────

export interface ScanRecord {
  id: string;
  qrCodeId: string | null;
  content: string | null;
  contentType: string | null;
  scanSource: "camera" | "gallery" | "viewed" | null;
  isAnonymous: boolean;
  scannedAt: string | null;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface QrAnalytics {
  totalScans: number;
  scans7d: number;
  scans30d: number;
  trend7d: number[];
  platformBreakdown: { android: number; ios: number; web: number; unknown: number };
  verdictBreakdown?: { safe: number; flagged: number; unknown: number };
  topHours: number[];
  cachedAt: number;
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export type FriendStatus = "pending" | "friends" | "declined" | "blocked";

export interface FriendRecord {
  userId: string;
  status: FriendStatus;
  addedAt: string | null;
}

// ─── Donations ────────────────────────────────────────────────────────────────

export type DonationStatus = "pending" | "success" | "failed" | "refunded";

export interface Donation {
  id: string;
  orderId: string;
  paymentId: string | null;
  amountPaise: number;
  currency: string;
  donorName: string | null;
  donorEmail: string | null;
  status: DonationStatus;
  paidAt: string | null;
  createdAt: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}
