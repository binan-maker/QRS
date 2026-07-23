// NOTE: server-verify-service (firebase-admin) has been moved to apps/api/src/services/
// so it is never bundled into the Expo/React-Native app. Weight validation at the
// server-authoritative level happens in the Express route (apps/api/src/routes/qr.ts)
// which verifies the Firebase token before calling reportQrCode.

import { db } from "@/lib/db/client";
import { notifyQrFollowers } from "../notifications/notification-service";
import { COLLECTIONS } from "@/shared/constants/collections";
import {
  checkReportEligibility,
  recordReport,
  analyzeReportsForCollusion,
} from "../integrity";

async function getQrOwnerId(qrId: string): Promise<string | undefined> {
  try {
    const data = await db.get([COLLECTIONS.QR_CODES, qrId]);
    return data?.ownerId || undefined;
  } catch {
    return undefined;
  }
}

export async function getQrReportData(qrId: string): Promise<{
  counts: Record<string, number>;
  weighted: Record<string, number>;
}> {
  // FIX: unbounded query — cap at 500 (far above any realistic report count
  // per QR code; prevents a full collection scan on heavily reported QRs)
  const { docs } = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS], { limit: 500 });
  const counts: Record<string, number> = {};
  const weighted: Record<string, number> = {};
  for (const d of docs) {
    if (d.data.userRemoved) continue;
    const { reportType, weight = 1 } = d.data;
    counts[reportType] = (counts[reportType] || 0) + 1;
    weighted[reportType] = (weighted[reportType] || 0) + weight;
  }
  return { counts, weighted };
}

export async function getQrReportCounts(qrId: string): Promise<Record<string, number>> {
  return (await getQrReportData(qrId)).counts;
}

export async function getQrWeightedReportCounts(qrId: string): Promise<Record<string, number>> {
  return (await getQrReportData(qrId)).weighted;
}

export async function getUserQrReport(qrId: string, userId: string): Promise<string | null> {
  const data = await db.get([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS, userId]);
  if (!data || data.userRemoved) return null;
  return data.reportType ?? null;
}

function runCollusionCheck(qrId: string) {
  analyzeReportsForCollusion(qrId).then(async (result) => {
    try {
      await db.update([COLLECTIONS.QR_CODES, qrId], {
        suspiciousVoteFlag: result.suspicious,
        suspiciousFlagReason: result.reason || null,
        suspiciousSafeMultiplier: result.safeWeightMultiplier,
        suspiciousNegMultiplier: result.negativeWeightMultiplier,
        suspiciousLastChecked: db.timestamp(),
      });
    } catch {}
  }).catch(() => {});
}

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified: boolean = false
): Promise<{ action: "created" | "updated" | "removed" }> {

  const [qrOwnerId, existingReport] = await Promise.all([
    getQrOwnerId(qrId),
    getUserQrReport(qrId, userId),
  ]);

  // Same type tapped again → unreport (toggle off).
  // Firestore rules block deletion, so we mark the doc as userRemoved instead.
  // The existing reportType and weight fields stay intact to satisfy security rules.
  if (existingReport === reportType) {
    await db.update([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS, userId], {
      userRemoved: true,
      removedAt: db.timestamp(),
    });
    runCollusionCheck(qrId);
    return { action: "removed" };
  }

  // Switching an existing vote should not count against rate limits.
  // isChangingReport=true bypasses the per-QR and hourly counters in checkReportEligibility.
  const isChangingReport = existingReport !== null;
  // weight is calculated by checkReportEligibility based on user tier / eligibility rules.
  // Server-authoritative weight validation (firebase-admin) runs in the Express route layer
  // (apps/api/src/routes/qr.ts) which verifies the Firebase token before calling here.
  const { weight } = await checkReportEligibility(userId, qrId, emailVerified, qrOwnerId, isChangingReport);

  let accountAgeDays = 0;
  try {
    const userData = await db.get([COLLECTIONS.USERS, userId]);
    if (userData?.createdAt) {
      const createdMs = userData.createdAt.toDate
        ? userData.createdAt.toDate().getTime()
        : new Date(userData.createdAt).getTime();
      accountAgeDays = Math.floor((Date.now() - createdMs) / 86400000);
    }
  } catch {}

  if (isChangingReport) {
    // Different type → update the existing report doc (also clears userRemoved if set).
    await db.update([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS, userId], {
      reportType,
      weight,
      userRemoved: false,
      updatedAt: db.timestamp(),
    });
  } else {
    // No active report — create or overwrite (handles re-reporting after unreport).
    // db.set uses setDoc (no merge) so it fully replaces any stale userRemoved doc.
    await db.set([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS, userId], {
      reportType,
      weight,
      reporterId: userId,
      accountAgeDays,
      emailVerified,
      userRemoved: false,
      createdAt: db.timestamp(),
    });
    await recordReport(userId, qrId);
    if (reportType === "safe") {
      try { await db.increment([COLLECTIONS.USERS, userId], "safeReportsGiven", 1); } catch {}
    }
    notifyQrFollowers(qrId, "new_report", `New ${reportType} report on a QR you follow`, userId).catch(() => {});
  }

  runCollusionCheck(qrId);
  return { action: existingReport !== null ? "updated" : "created" };
}

export function subscribeToQrReports(
  qrId: string,
  onUpdate: (
    counts: Record<string, number>,
    weightedCounts: Record<string, number>
  ) => void
): () => void {
  // FIX: unbounded live listener — cap at 500 to match getQrReportData
  return db.onQuery([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS], { limit: 500 }, (docs) => {
    const counts: Record<string, number> = {};
    const weighted: Record<string, number> = {};
    for (const d of docs) {
      if (d.data.userRemoved) continue;
      const { reportType, weight = 1 } = d.data;
      counts[reportType] = (counts[reportType] || 0) + 1;
      weighted[reportType] = (weighted[reportType] || 0) + weight;
    }
    onUpdate(counts, weighted);
  });
}
