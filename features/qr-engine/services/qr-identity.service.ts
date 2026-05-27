/**
 * QR Engine — QR Identity Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic for creating, updating, and enriching QrIdentity objects
 * from Firestore documents. This is the bridge between raw Firestore data
 * and the canonical QrIdentity shape.
 *
 * Firestore document → QrIdentity (via buildQrIdentity)
 * QrIdentity → Firestore update payload (via toFirestoreUpdate)
 */

import { buildQrIdentity, refreshQrIdentity } from "../identity";
import { detectContentType } from "../detector";
import type { QrIdentity, QrAnalyticsSummary } from "../types";

// ─── Firestore document shapes ────────────────────────────────────────────────
// These mirror the actual Firestore document structure used in services/
interface FirestoreQrDoc {
  id?: string;
  rawContent?: string;
  content?: string;
  contentType?: string;
  templateKey?: string;
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
  ownerId?: string;
  isActive?: boolean;
  isDynamic?: boolean;
  scanCount?: number;
  lastScannedAt?: any;
  trustScore?: number;
  reportCount?: number;
  isVerifiedMerchant?: boolean;
}

/**
 * Convert a raw Firestore QR document into a canonical QrIdentity.
 */
export function fromFirestoreDoc(
  docId: string,
  doc: FirestoreQrDoc
): QrIdentity {
  const payload = doc.rawContent ?? doc.content ?? "";
  const contentType =
    doc.contentType ?? doc.templateKey ?? detectContentType(payload);

  const createdAt =
    doc.createdAt?.toMillis?.() ??
    (typeof doc.createdAt === "number" ? doc.createdAt : undefined);
  const updatedAt =
    doc.updatedAt?.toMillis?.() ??
    (typeof doc.updatedAt === "number" ? doc.updatedAt : undefined);
  const lastScannedAt =
    doc.lastScannedAt?.toMillis?.() ??
    (typeof doc.lastScannedAt === "number" ? doc.lastScannedAt : undefined);

  return buildQrIdentity(docId, payload, contentType, {
    owner_id: doc.userId ?? doc.ownerId,
    is_dynamic: doc.isDynamic ?? false,
    is_active: doc.isActive ?? true,
    created_at: createdAt,
    updated_at: updatedAt,
    reportCount: doc.reportCount,
    verifiedMerchant: doc.isVerifiedMerchant,
    analytics: {
      scan_count: doc.scanCount ?? 0,
      last_scanned_at: lastScannedAt,
    },
  });
}

/**
 * Convert a scan history item into a QrIdentity (read-only, no owner).
 */
export interface ScanHistoryItem {
  id?: string;
  rawContent: string;
  contentType?: string;
  scannedAt?: any;
  risk?: string;
}

export function fromScanHistoryItem(item: ScanHistoryItem): QrIdentity {
  const contentType = item.contentType ?? detectContentType(item.rawContent);
  const scannedAt =
    item.scannedAt?.toMillis?.() ??
    (typeof item.scannedAt === "number" ? item.scannedAt : Date.now());

  return buildQrIdentity(
    item.id ?? `scan_${scannedAt}`,
    item.rawContent,
    contentType,
    {
      analytics: {
        scan_count: 1,
        last_scanned_at: scannedAt,
      },
    }
  );
}

/**
 * Build a minimal Firestore update payload from scan event data.
 */
export function toScanUpdatePayload(qrId: string): Record<string, any> {
  return {
    scanCount: { __increment: 1 },
    lastScannedAt: { __serverTimestamp: true },
    updatedAt: { __serverTimestamp: true },
  };
}
