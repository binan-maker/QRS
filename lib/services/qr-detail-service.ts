// ─── QR Detail Orchestrator ───────────────────────────────────────────────────
// Single responsibility: assembling the full QR detail view payload.
// Coordinates across report, follow, trust and user services — but owns
// none of that logic itself. Changing the Trust Score algorithm means editing
// trust-service.ts only; this file stays untouched.

import { db } from "../db/client";
import { getQrCodeById } from "./qr-service";
import { getQrReportCounts, getQrWeightedReportCounts, getUserQrReport } from "./report-service";
import { isUserFollowingQrCode, getFollowCount } from "./follow-service";
import { isUserFavorite } from "./user-service";
import { calculateTrustScore } from "./trust-service";
import type { QrCodeData, TrustScore } from "./types";

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
    const [rc, wc, fc, qrDoc] = await Promise.all([
      getQrReportCounts(qrId),
      getQrWeightedReportCounts(qrId),
      getFollowCount(qrId),
      db.get(["qrCodes", qrId]),
    ]);
    reportCounts = rc;
    weightedCounts = wc;
    followCount = fc;
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
