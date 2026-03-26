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
