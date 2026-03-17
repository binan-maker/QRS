export const SIGNATURE_SALT = "QRG_MINT_VERIFIED_2024_PROPRIETARY";

export type QrType = "individual" | "business" | "government";

export interface QrCodeData {
  id: string;
  content: string;
  contentType: string;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  ownerId?: string;
  ownerName?: string;
  brandedUuid?: string;
  isBranded?: boolean;
  signature?: string;
  ownerVerified?: boolean;
  qrType?: QrType;
  isActive?: boolean;
  deactivationMessage?: string | null;
  businessName?: string | null;
}

export interface QrOwnerInfo {
  ownerId: string;
  ownerName: string;
  brandedUuid: string;
  isBranded: boolean;
  signature?: string;
  ownerVerified?: boolean;
  qrType?: QrType;
  isActive?: boolean;
  deactivationMessage?: string | null;
  businessName?: string | null;
  ownerLogoBase64?: string | null;
}

export interface ScanVelocityBucket {
  hour: number;
  label: string;
  count: number;
}

export interface VerificationStatus {
  status: "none" | "pending" | "approved" | "rejected";
  businessName?: string;
  submittedAt?: string;
}

export interface FollowerInfo {
  userId: string;
  displayName: string;
  followedAt: string;
  username?: string | null;
  photoURL?: string | null;
}

export interface QrMessage {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  qrCodeId: string;
  qrBrandedUuid: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  qrCodeId: string;
  userId: string;
  text: string;
  parentId: string | null;
  isDeleted: boolean;
  isHidden?: boolean;
  reportCount?: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  userLike: "like" | "dislike" | null;
  user: { displayName: string };
  userUsername?: string;
  userPhotoURL?: string;
}

export interface TrustScore {
  score: number;
  label: string;
  totalReports: number;
}

export interface Notification {
  id: string;
  type: "new_comment" | "new_report";
  qrCodeId: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface UserStats {
  followingCount: number;
  scanCount: number;
  commentCount: number;
  totalLikesReceived: number;
}

export interface GeneratedQrItem {
  docId: string;
  content: string;
  contentType: string;
  uuid: string;
  branded: boolean;
  qrCodeId: string;
  createdAt: string;
  fgColor: string;
  bgColor: string;
  logoPosition: string;
  logoUri: string | null;
  scanCount: number;
  commentCount: number;
  qrType: QrType;
  isActive: boolean;
  deactivationMessage: string | null;
  businessName: string | null;
  guardUuid: string | null;
}

export interface UsernameData {
  username: string | null;
  usernameLastChangedAt: Date | null;
}

export interface GuardLink {
  uuid: string;
  currentDestination: string;
  previousDestination: string | null;
  businessName: string | null;
  ownerName: string;
  ownerId: string;
  isActive: boolean;
  destinationChangedAt: string | null;
  createdAt: string;
}
