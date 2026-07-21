import type { QrContentType, QrRiskLevel } from "./qr";

// ── Scan ──────────────────────────────────────────────────────────────────────

export interface Scan {
  id: string;
  userId: string;
  content: string;
  contentType: QrContentType;
  /** Linked QR code document ID, if the QR is registered in the platform. */
  qrCodeId: string | null;
  scannedAt: number;
  riskLevel?: QrRiskLevel;
  /** Soft-delete timestamp; present only on deleted records. */
  deletedAt?: number | null;
}

export interface ScanPage {
  items: Scan[];
  /** Opaque cursor for fetching the next page. */
  nextCursor: unknown | null;
  hasMore: boolean;
}
