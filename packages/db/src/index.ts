/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL DATABASE ENTITY MODELS & TYPES (@binro/db)
 * ───────────────────────────────────────────────────────────────────────────────
 * Shared database models matching the Supabase PostgreSQL database schema.
 * All properties are strongly typed and documented.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── 1. User Entity (public.users) ──────────────────────────────────────────────
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

// ── 2. QR Code Entity (public.qr_codes) ────────────────────────────────────────
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

// ── 3. QR Scan Event Entity (public.qr_scans) ──────────────────────────────────
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

// ── 4. QR Comment Entity (public.qr_comments) ──────────────────────────────────
export interface QrComment {
  id: string;
  qrCodeId: string;
  userId: string;
  userName: string;
  parentId?: string | null;
  text: string;
  likes: number;
  reportCount: number;
  isDeleted: boolean;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NewQrComment = Omit<QrComment, "id" | "createdAt" | "updatedAt">;

// ── 5. Comment Like Entity (public.comment_likes) ──────────────────────────────
export interface CommentLike {
  commentId: string;
  userId: string;
  createdAt: Date;
}

// ── 6. QR Fraud Report Entity (public.qr_reports) ──────────────────────────────
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

// ── 7. User Favorite Entity (public.user_favorites) ────────────────────────────
export interface UserFavorite {
  id: string;
  userId: string;
  qrId: string;
  qrCodeId?: string | null;
  createdAt: Date;
}

// ── 8. Notification Entity (public.notifications) ──────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  qrCodeId?: string | null;
  fromUserId?: string | null;
  fromUsername?: string | null;
  isRead: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
}

// ── 9. Feedback & Crash Report Entity (public.feedback) ────────────────────────
export interface FeedbackReport {
  id: string;
  userId?: string | null;
  email?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  userMessage?: string | null;
  deviceInfo?: string | null;
  appVersion?: string | null;
  createdAt: Date;
}

// ── 10. Audit Log Entity (public.audit_logs) ───────────────────────────────────
export interface AuditLog {
  id: string;
  qrId?: string | null;
  userId?: string | null;
  action: string;
  voteWeight?: number | null;
  accountTier?: number | null;
  accountAgeDays?: number | null;
  emailVerified?: boolean | null;
  collusionFlags?: Record<string, unknown> | null;
  createdAt: Date;
}
