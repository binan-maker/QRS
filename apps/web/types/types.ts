/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO WEB: TYPE DEFINITIONS
 * ───────────────────────────────────────────────────────────────────────────────
 * TypeScript types for API responses, QR models, and user profiles.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
  status: number;
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

export interface UserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  username: string | null;
  scanCount: number;
  personalScanCount?: number;
  commentCount: number;
  totalLikesReceived?: number;
  createdAt: string | null;
  updatedAt?: string | null;
}

export interface PublicUserProfile {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  username: string | null;
  scanCount: number;
  commentCount: number;
  createdAt: string | null;
}

export interface ScanItem {
  id: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  isAnonymous?: boolean;
  platform?: string;
  scannedAt: string;
}
