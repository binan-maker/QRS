/**
 * @domain/qr — QR Code domain
 *
 * Pure business logic — zero framework dependencies.
 * No imports from express, drizzle, firebase, or any infrastructure package.
 *
 * Phase 3 target: route handlers call use cases in application/qr/,
 * which call IQrCodeRepository defined here.
 */

import type { QrCode, UnifiedQr } from "@binro/db";

// ─── Entity ───────────────────────────────────────────────────────────────────

export type QrStatus = "active" | "inactive" | "expired" | "limit_reached";

/** Pure function — no I/O. Computes the current status of a legacy QR. */
export function computeQrStatus(qr: Pick<QrCode, "isActive" | "scanLimit" | "scanCount" | "expiryDate">): QrStatus {
  if (!qr.isActive) return "inactive";
  if (qr.scanLimit != null && qr.scanCount >= qr.scanLimit) return "limit_reached";
  if (qr.expiryDate && new Date(qr.expiryDate) < new Date()) return "expired";
  return "active";
}

/** Pure function — no I/O. Computes the current status of a unified QR. */
export function computeUnifiedQrStatus(qr: Pick<UnifiedQr, "status" | "scanLimit" | "scanCount" | "expiryDate">): QrStatus {
  if (qr.status === "inactive") return "inactive";
  if (qr.scanLimit != null && qr.scanCount >= qr.scanLimit) return "limit_reached";
  if (qr.expiryDate && new Date(qr.expiryDate) < new Date()) return "expired";
  return "active";
}

// ─── Repository Port ──────────────────────────────────────────────────────────
// The application layer depends on this interface, not on Drizzle directly.

export interface IQrCodeRepository {
  findById(id: string): Promise<QrCode | null>;
  findByUuid(uuid: string): Promise<QrCode | null>;
  findByOwnerId(ownerId: string, limit?: number, offset?: number): Promise<QrCode[]>;
  create(data: Omit<QrCode, "id" | "createdAt" | "updatedAt">): Promise<QrCode>;
  update(id: string, data: Partial<QrCode>): Promise<QrCode>;
  delete(id: string): Promise<void>;
  incrementScanCount(id: string): Promise<void>;
}

export interface IUnifiedQrRepository {
  findById(id: string): Promise<UnifiedQr | null>;
  findByOwnerId(ownerId: string, limit?: number, offset?: number): Promise<UnifiedQr[]>;
  create(data: Omit<UnifiedQr, "createdAt" | "updatedAt">): Promise<UnifiedQr>;
  update(id: string, data: Partial<UnifiedQr>): Promise<UnifiedQr>;
  delete(id: string): Promise<void>;
  incrementScanCount(id: string): Promise<void>;
}

// ─── Domain Events ────────────────────────────────────────────────────────────

export type QrCreatedEvent = {
  type: "QR_CREATED";
  qrId: string;
  ownerId: string;
  contentType: string;
  timestamp: Date;
};

export type QrDestinationChangedEvent = {
  type: "QR_DESTINATION_CHANGED";
  qrId: string;
  fromDestination: string;
  toDestination: string;
  changedBy: string;
  timestamp: Date;
};

export type QrDeactivatedEvent = {
  type: "QR_DEACTIVATED";
  qrId: string;
  reason?: string;
  timestamp: Date;
};

export type QrDomainEvent =
  | QrCreatedEvent
  | QrDestinationChangedEvent
  | QrDeactivatedEvent;
