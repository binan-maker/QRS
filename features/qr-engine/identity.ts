/**
 * QR Engine — Identity Builder
 * ─────────────────────────────────────────────────────────────────────────────
 * Constructs a canonical QrIdentity object from raw QR data.
 * This is the infrastructure-grade representation of a QR code — the shape
 * that flows through services, Firestore, and analytics.
 *
 * Usage:
 *   const identity = buildQrIdentity(docId, rawContent, contentType);
 *   const identity = buildQrIdentity(docId, rawContent, contentType, {
 *     owner_id: user.uid,
 *     is_dynamic: true,
 *     analytics: { scan_count: 42 },
 *   });
 */

import { getQrTypeMeta, getDisplayLabel, getSubtitle } from "./registry";
import { computeTrustScore } from "./trust";
import { emptyAnalytics } from "./analytics";
import type {
  QrIdentity,
  QrAnalyticsSummary,
  QrTrustSummary,
  QrVerification,
} from "./types";

interface BuildOptions {
  owner_id?: string;
  is_dynamic?: boolean;
  is_active?: boolean;
  analytics?: Partial<QrAnalyticsSummary>;
  trust?: Partial<QrTrustSummary>;
  verification?: QrVerification;
  created_at?: number;
  updated_at?: number;
  /** Community report count */
  reportCount?: number;
}

export function buildQrIdentity(
  qr_id: string,
  payload: string,
  qr_type: string,
  options: BuildOptions = {}
): QrIdentity {
  const typeMeta = getQrTypeMeta(qr_type);
  const displayLabel = getDisplayLabel(payload, qr_type);
  const subtitle = getSubtitle(payload, qr_type);

  const analytics: QrAnalyticsSummary = {
    ...emptyAnalytics(),
    ...options.analytics,
  };

  const computedTrust = computeTrustScore({
    reportCount: options.reportCount,
  });

  const trust: QrTrustSummary = {
    ...computedTrust,
    ...options.trust,
  };

  return {
    qr_id,
    qr_type,
    payload,
    metadata: {
      displayLabel,
      subtitle,
      icon: typeMeta.icon,
      color: typeMeta.color,
      bg: typeMeta.bg,
      gradient: typeMeta.gradient,
      category: typeMeta.category,
    },
    analytics,
    trust,
    owner_id: options.owner_id,
    created_at: options.created_at ?? Date.now(),
    updated_at: options.updated_at ?? Date.now(),
    is_dynamic: options.is_dynamic ?? false,
    is_active: options.is_active ?? true,
    verification: options.verification,
  };
}

/**
 * Refresh the metadata + trust on an existing QrIdentity.
 * Call this when analytics or community data changes.
 */
export function refreshQrIdentity(
  existing: QrIdentity,
  updates: Partial<Pick<BuildOptions, "analytics" | "trust" | "reportCount">>
): QrIdentity {
  const recomputed = computeTrustScore({
    reportCount: updates.reportCount,
  });

  return {
    ...existing,
    updated_at: Date.now(),
    analytics: {
      ...existing.analytics,
      ...updates.analytics,
    },
    trust: {
      ...recomputed,
      ...updates.trust,
    },
  };
}
