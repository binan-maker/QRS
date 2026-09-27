/**
 * @domain/scan — Scan Recording domain
 *
 * Pure fraud guard rules, extracted from services/scan-fraud-guard.ts.
 * No I/O — all inputs are passed in, all outputs are returned.
 */

import type { QrScan } from "@binro/db";

// ─── Fraud Guard Policy ───────────────────────────────────────────────────────

export interface ScanContext {
  qrId: string;
  userId: string | null;
  /** Client-supplied device fingerprint (best-effort). */
  deviceId?: string;
  /** Seconds since this user/device last scanned this QR. */
  secondsSinceLastScan: number | null;
}

export interface ScanGuardResult {
  allowed: boolean;
  reason?: "duplicate" | "rate_limited" | "qr_frozen" | "scan_limit_exceeded";
}

const DEDUP_WINDOW_SECONDS = 30;

/** Pure rule — no I/O. Call before persisting any scan record. */
export function applyScanFraudGuard(ctx: ScanContext): ScanGuardResult {
  if (
    ctx.secondsSinceLastScan !== null &&
    ctx.secondsSinceLastScan < DEDUP_WINDOW_SECONDS
  ) {
    return { allowed: false, reason: "duplicate" };
  }
  return { allowed: true };
}

// ─── Repository Port ──────────────────────────────────────────────────────────

export interface IScanRepository {
  record(data: Omit<QrScan, "id" | "scannedAt">): Promise<QrScan>;
  findRecentByUser(userId: string, limit?: number): Promise<QrScan[]>;
  findRecentByQr(qrId: string, limit?: number): Promise<QrScan[]>;
  /** Returns seconds since the user/device last scanned this QR, or null. */
  getSecondsSinceLastScan(qrId: string, userId: string | null, deviceId?: string): Promise<number | null>;
}
