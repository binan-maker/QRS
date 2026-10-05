// ─── QR Detail Orchestrator ───────────────────────────────────────────────────
// Single responsibility: assembling the full QR detail view payload.
// Coordinates across report, trust and user services — but owns
// none of that logic itself. Changing the Trust Score algorithm means editing
// trust-service.ts only; this file stays untouched.

import { db } from "@/lib/db/client";
import { tsToMs } from "../integrity/time-utils";
import { getQrCodeById } from "./qr-service";
import { getQrReportData, getUserQrReport } from "../moderation/report-service";

import { calculateTrustScore } from "../trust/trust-service";
import type { QrCodeData, TrustScore } from "../types";
import { COLLECTIONS } from "@/shared/constants/collections";

export interface QrDetailPayload {
  qrCode: QrCodeData;
  reportCounts: Record<string, number>;
  totalScans: number;
  totalComments: number;
  trustScore: TrustScore;
  userReport: string | null;
}

export async function loadQrDetail(
  qrId: string,
  userId: string | null
): Promise<QrDetailPayload | null> {
  const qrCode = await getQrCodeById(qrId);
  if (!qrCode) return null;

  let reportCounts: Record<string, number> = {};
  let weightedCounts: Record<string, number> = {};
  let collusionFlags = { suspicious: false, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };

  try {
    const [reportData, qrDoc] = await Promise.all([
      getQrReportData(qrId),
      db.get([COLLECTIONS.QR_CODES, qrId]),
    ]);
    reportCounts = reportData.counts;
    weightedCounts = reportData.weighted;
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

  if (userId) {
    try {
      userReport = await getUserQrReport(qrId, userId);
    } catch {}
  }

  return {
    qrCode,
    reportCounts,
    totalScans: qrCode.scanCount,
    totalComments: qrCode.commentCount,
    trustScore,
    userReport,
  };
}

