import { db } from "../db";
import { notifyQrFollowers } from "./notification-service";
import {
  checkReportEligibility,
  recordReport,
  analyzeReportsForCollusion,
} from "./integrity-service";

async function getQrOwnerId(qrId: string): Promise<string | undefined> {
  try {
    const data = await db.get(["qrCodes", qrId]);
    return data?.ownerId || undefined;
  } catch {
    return undefined;
  }
}

export async function getQrReportCounts(qrId: string): Promise<Record<string, number>> {
  const { docs } = await db.query(["qrCodes", qrId, "reports"]);
  const counts: Record<string, number> = {};
  for (const d of docs) {
    const { reportType } = d.data;
    counts[reportType] = (counts[reportType] || 0) + 1;
  }
  return counts;
}

export async function getQrWeightedReportCounts(qrId: string): Promise<Record<string, number>> {
  const { docs } = await db.query(["qrCodes", qrId, "reports"]);
  const weighted: Record<string, number> = {};
  for (const d of docs) {
    const { reportType, weight = 1 } = d.data;
    weighted[reportType] = (weighted[reportType] || 0) + weight;
  }
  return weighted;
}

export async function getUserQrReport(qrId: string, userId: string): Promise<string | null> {
  const data = await db.get(["qrCodes", qrId, "reports", userId]);
  return data ? data.reportType : null;
}

function runCollusionCheck(qrId: string) {
  analyzeReportsForCollusion(qrId).then(async (result) => {
    try {
      await db.update(["qrCodes", qrId], {
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

  const qrOwnerId = await getQrOwnerId(qrId);
  const existingReport = await getUserQrReport(qrId, userId);

  // Same type tapped again → unreport (toggle off)
  if (existingReport === reportType) {
    await db.delete(["qrCodes", qrId, "reports", userId]);
    runCollusionCheck(qrId);
    return { action: "removed" };
  }

  // Check eligibility — throws with descriptive error if not allowed
  const { weight } = await checkReportEligibility(userId, qrId, emailVerified, qrOwnerId, false);

  let accountAgeDays = 0;
  try {
    const userData = await db.get(["users", userId]);
    if (userData?.createdAt) {
      const createdMs = userData.createdAt.toDate
        ? userData.createdAt.toDate().getTime()
        : new Date(userData.createdAt).getTime();
      accountAgeDays = Math.floor((Date.now() - createdMs) / 86400000);
    }
  } catch {}

  if (existingReport !== null) {
    // Different type → update the existing report doc
    await db.update(["qrCodes", qrId, "reports", userId], {
      reportType,
      weight,
      updatedAt: db.timestamp(),
    });
  } else {
    // No prior report → create a new one
    await db.set(["qrCodes", qrId, "reports", userId], {
      reportType,
      weight,
      reporterId: userId,
      accountAgeDays,
      emailVerified,
      createdAt: db.timestamp(),
    });
    await recordReport(userId, qrId);
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
  return db.onQuery(["qrCodes", qrId, "reports"], {}, (docs) => {
    const counts: Record<string, number> = {};
    const weighted: Record<string, number> = {};
    for (const d of docs) {
      const { reportType, weight = 1 } = d.data;
      counts[reportType] = (counts[reportType] || 0) + 1;
      weighted[reportType] = (weighted[reportType] || 0) + weight;
    }
    onUpdate(counts, weighted);
  });
}
