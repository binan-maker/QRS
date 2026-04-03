export function getSignatureSalt(year?: number): string {
  const y = year ?? new Date().getFullYear();
  return `QRG_MINT_VERIFIED_${y}_PROPRIETARY`;
}

export const SIGNATURE_SALT = getSignatureSalt();

export type QrType = "individual" | "business" | "government";

export interface QrCodeData {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  isBranded?: boolean;
  signature?: string;
  ownerId?: string;
  ownerName?: string;
  qrType?: QrType;
  uuid?: string;
  businessName?: string;
  privateMode?: boolean;
  customLogoUri?: string;
  logoPosition?: string;
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
  followingCount: number;
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
  scanSource?: "camera" | "gallery";
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
  isVerifiedOwner?: boolean;
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
  | "new_follow"
  | "friend_request"
  | "friend_accepted"
  | "friend_declined"
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

export interface FollowData {
  id: string;
  userId: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  followedAt: string;
}

// Trust Score types
export interface TrustScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'verified';
  factors: TrustFactor[];
  lastUpdated: string;
  isVerified?: boolean;
  verificationMethod?: string;
}

export interface TrustFactor {
  name: string;
  weight: number;
  score: number;
  description?: string;
}

// User Stats types
export interface UserStats {
  totalScans: number;
  totalComments: number;
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
  totalQrsCreated: number;
  accountAge: number;
  reputationScore: number;
}

export interface UsernameData {
  username: string;
  userId: string;
  claimedAt: string;
  lastChangedAt?: string;
  isVerified?: boolean;
}

// Generator Service types
export interface GeneratedQrItem {
  id: string;
  content: string;
  format: 'png' | 'svg' | 'webp';
  size: number;
  createdAt: string;
  expiresAt?: string;
  downloadUrl?: string;
}

export interface QrOwnerInfo {
  ownerId: string;
  ownerName: string;
  isVerified: boolean;
  badgeType?: 'business' | 'government' | 'creator';
  joinDate?: string;
  totalQrs?: number;
}

export interface ScanVelocityBucket {
  bucket: string;
  count: number;
  windowStart: string;
  windowEnd: string;
}

export interface VerificationStatus {
  isVerified: boolean;
  method: 'email' | 'phone' | 'document' | 'manual' | 'none';
  verifiedAt?: string;
  documents?: string[];
  pendingReview?: boolean;
}

// Comment Service types
export interface CommentItem {
  id: string;
  qrCodeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  likedBy: string[];
  replies?: CommentItem[];
  parentId?: string;
  isEdited?: boolean;
  isPinned?: boolean;
  isVerifiedOwner?: boolean;
  reports?: number;
}

// Guard Service types
export interface GuardLink {
  id: string;
  sourceQrId: string;
  targetQrId: string;
  relationship: 'parent' | 'child' | 'related' | 'duplicate';
  createdAt: string;
  metadata?: Record<string, any>;
}

// Message Service types
export interface QrMessage {
  id: string;
  qrCodeId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: 'text' | 'warning' | 'info' | 'alert';
  createdAt: string;
  read: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

// Follow Service types
export interface FollowerInfo {
  followerId: string;
  followerName: string;
  followerAvatar?: string;
  followedAt: string;
  isMutual: boolean;
  isVerified?: boolean;
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
