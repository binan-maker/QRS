// ─── QR Detail Orchestrator ───────────────────────────────────────────────────
// Single responsibility: assembling the full QR detail view payload.
// Coordinates across report, follow, trust and user services — but owns
// none of that logic itself. Changing the Trust Score algorithm means editing
// trust-service.ts only; this file stays untouched.

import { db } from "@/lib/db/client";
import { getQrCodeById } from "./qr-service";
import { getQrReportData, getUserQrReport } from "../moderation/report-service";
import { isUserFollowingQrCode } from "../social/follow-service";

import { isUserFavorite } from "../user/favorites";
import { calculateTrustScore } from "../trust/trust-service";
import type { QrCodeData, TrustScore } from "../types";
import { COLLECTIONS } from "@/shared/constants/collections";

export interface QrDetailPayload {
  qrCode: QrCodeData;
  reportCounts: Record<string, number>;
  totalScans: number;
  totalComments: number;
  trustScore: TrustScore;
  followCount: number;
  userReport: string | null;
  isFavorite: boolean;
  isFollowing: boolean;
}

export async function loadQrDetail(
  qrId: string,
  userId: string | null
): Promise<QrDetailPayload | null> {
  const qrCode = await getQrCodeById(qrId);
  if (!qrCode) return null;

  let reportCounts: Record<string, number> = {};
  let weightedCounts: Record<string, number> = {};
  let followCount = 0;
  let collusionFlags = { suspicious: false, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };

  try {
    const [reportData, qrDoc] = await Promise.all([
      getQrReportData(qrId),
      db.get([COLLECTIONS.QR_CODES, qrId]),
    ]);
    reportCounts = reportData.counts;
    weightedCounts = reportData.weighted;
    followCount = typeof qrDoc?.followerCount === "number" ? qrDoc.followerCount : 0;
    if (qrDoc?.suspiciousVoteFlag) {
      collusionFlags = {
        suspicious: true,
        safeWeightMultiplier: qrDoc.suspiciousSafeMultiplier ?? 1,
        negativeWeightMultiplier: qrDoc.suspiciousNegMultiplier ?? 1,
      };
    }
  } catch {}

  const trustScore = calculateTrustScore(reportCounts, weightedCounts, collusionFlags);

  let userReport: string | null = null;
  let isFavorite = false;
  let isFollowing = false;

  if (userId) {
    try {
      [userReport, isFavorite, isFollowing] = await Promise.all([
        getUserQrReport(qrId, userId),
        isUserFavorite(qrId, userId),
        isUserFollowingQrCode(qrId, userId),
      ]);
    } catch {}
  }

  return {
    qrCode,
    reportCounts,
    totalScans: qrCode.scanCount,
    totalComments: qrCode.commentCount,
    trustScore,
    followCount,
    userReport,
    isFavorite,
    isFollowing,
  };
}

// ─── QR Analytics Aggregation ─────────────────────────────────────────────────
// Reads qrCodes/{qrId}/events subcollection and returns aggregated metrics.
// Results are cached in-memory for 10 minutes to minimise Firestore reads.

export interface QrAnalyticsSummary {
  totalScans: number;
  scans7d: number;
  scans30d: number;
  /** 7 values, index 0 = today, index 6 = 6 days ago */
  trend7d: number[];
  platformBreakdown: { android: number; ios: number; web: number; unknown: number };
  verdictBreakdown: { safe: number; flagged: number; unknown: number };
  /** 24 values, one per hour-of-day (UTC) */
  topHours: number[];
  cachedAt: number;
}

const _analyticsCache = new Map<string, { data: QrAnalyticsSummary; expiresAt: number }>();
const ANALYTICS_CACHE_TTL_MS = 10 * 60 * 1000;

export async function getQrAnalyticsSummary(
  qrId: string,
  _ownerId: string
): Promise<QrAnalyticsSummary> {
  const now = Date.now();
  const cached = _analyticsCache.get(qrId);
  if (cached && now < cached.expiresAt) return cached.data;

  const MS_7D  = 7  * 24 * 60 * 60 * 1000;
  const MS_30D = 30 * 24 * 60 * 60 * 1000;

  // Read the authoritative fraud-guarded scan counter from the qrCode document first.
  // This is accurate at any scale; event docs are capped at 2000 for trend analysis only.
  let authoritiveScanCount = 0;
  try {
    const qrDoc = await db.get([COLLECTIONS.QR_CODES, qrId]);
    if (qrDoc?.scanCount != null) {
      authoritiveScanCount = qrDoc.scanCount as number;
    }
  } catch {}

  let docs: Array<{ id: string; data: Record<string, any> }> = [];
  try {
    const result = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.EVENTS], {
      orderBy: { field: "timestamp", direction: "desc" },
      limit: 2000,
    });
    docs = result.docs;
  } catch {
    // Return empty summary on error — non-fatal.
  }

  // Use the authoritative counter; fall back to event count if doc has no counter yet
  const totalScans = authoritiveScanCount > 0 ? authoritiveScanCount : docs.length;
  let scans7d = 0;
  let scans30d = 0;
  const trend7d = new Array(7).fill(0);
  const platformBreakdown = { android: 0, ios: 0, web: 0, unknown: 0 };
  const verdictBreakdown  = { safe: 0, flagged: 0, unknown: 0 };
  const topHours          = new Array(24).fill(0);

  for (const doc of docs) {
    const d = doc.data;
    let ts: number;
    if (d.timestamp && typeof d.timestamp.toDate === "function") {
      ts = d.timestamp.toDate().getTime();
    } else if (typeof d.timestamp === "string") {
      ts = new Date(d.timestamp).getTime();
    } else {
      ts = now;
    }
    const age = now - ts;

    if (age < MS_7D) {
      scans7d++;
      const dayIdx = Math.min(6, Math.floor(age / 86_400_000));
      trend7d[dayIdx]++;
    }
    if (age < MS_30D) scans30d++;

    const plat = (d.platform || "unknown") as string;
    if (plat in platformBreakdown) (platformBreakdown as any)[plat]++;
    else platformBreakdown.unknown++;

    const ver = (d.verdict || "unknown") as string;
    if (ver in verdictBreakdown) (verdictBreakdown as any)[ver]++;
    else verdictBreakdown.unknown++;

    topHours[new Date(ts).getHours()]++;
  }

  const summary: QrAnalyticsSummary = {
    totalScans, scans7d, scans30d, trend7d,
    platformBreakdown, verdictBreakdown, topHours, cachedAt: now,
  };

  _analyticsCache.set(qrId, { data: summary, expiresAt: now + ANALYTICS_CACHE_TTL_MS });
  return summary;
}
