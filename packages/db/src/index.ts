/**
 * Shared Firebase document types used by the API domain layer.
 *
 * Persistence is implemented by Firebase Admin/Firestore. These interfaces
 * describe document shapes only; they intentionally contain no SDK dependency.
 */

export interface User {
  id: string;
  firebaseUid?: string | null;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoUrl?: string | null;
  username?: string | null;
  usernameLastChangedAt?: Date | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  scanCount: number;
  commentCount: number;
  totalLikesReceived: number;
  isOnline: boolean;
  lastSeen?: Date | null;
  pushToken?: string | null;
  consent?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Omit<User, "createdAt" | "updatedAt">;

export interface QrCode {
  id: string;
  firebaseId?: string | null;
  content: string;
  contentType: string;
  ownerId?: string | null;
  ownerName: string;
  qrType: "individual" | "business" | "government";
  uuid?: string | null;
  businessName?: string | null;
  templateKey?: string | null;
  isActive: boolean;
  deactivationMessage?: string | null;
  privateMode: boolean;
  customLogoUri?: string | null;
  logoPosition?: string | null;
  displayDestination?: string | null;
  formValues?: Record<string, unknown> | null;
  scanCount: number;
  commentCount: number;
  ownerScanCount: number;
  scanCountFrozen: boolean;
  scanCountFreezeReason?: string | null;
  ownerVerified: boolean;
  scanLimit?: number | null;
  expiryDate?: string | null;
  expiryPreset?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnifiedQr {
  id: string;
  ownerId: string;
  ownerName: string;
  qrType: "individual" | "business" | "government";
  template?: string | null;
  title?: string | null;
  isDynamic: boolean;
  destination: string;
  rawDestination: string;
  contentType: string;
  businessName?: string | null;
  status: "active" | "inactive" | "expired" | "limit_reached";
  scanCount: number;
  downloads: number;
  shares: number;
  scanLimit?: number | null;
  expiryDate?: string | null;
  expiryPreset?: string | null;
  design: Record<string, unknown>;
  formValues?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUnifiedQr = Omit<UnifiedQr, "createdAt" | "updatedAt">;

export interface QrScan {
  id: string;
  qrCodeId?: string | null;
  unifiedQrId?: string | null;
  guardLinkId?: string | null;
  standardLinkId?: string | null;
  userId?: string | null;
  isAnonymous: boolean;
  scanSource?: string | null;
  platform: string;
  verdict: string;
  content?: string | null;
  contentType?: string | null;
  scannedAt: Date;
}

export type NewQrScan = Omit<QrScan, "id" | "scannedAt">;

export interface QrReport {
  id: string;
  qrCodeId?: string | null;
  unifiedQrId?: string | null;
  userId: string;
  reportType: string;
  weight: number;
  accountAgeDays: number;
  emailVerified: boolean;
  userRemoved: boolean;
  removedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewQrReport = Omit<QrReport, "id" | "createdAt" | "updatedAt">;
