/**
 * Shared types for BinRo
 */

export interface User {
  id: string;
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
  consent?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Omit<User, "createdAt" | "updatedAt">;

export interface QrCode {
  id: string;
  content: string;
  contentType: string;
  qrType: string;
  displayDestination?: string | null;
  scanCount: number;
  commentCount: number;
  scanLimit?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewQrCode = Omit<QrCode, "createdAt" | "updatedAt">;

export interface QrScan {
  id: string;
  qrCodeId?: string | null;
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
  qrCodeId: string;
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
