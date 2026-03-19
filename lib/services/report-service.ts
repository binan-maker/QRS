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

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified: boolean = false
): Promise<Record<string, number>> {

  // Fetch QR owner to block self-reporting
  const qrOwnerId = await getQrOwnerId(qrId);

  // Check eligibility — throws with descriptive error if not allowed
  const { weight } = await checkReportEligibility(userId, qrId, emailVerified, qrOwnerId);

  // Fetch account age for collusion analysis storage
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

  await db.set(["qrCodes", qrId, "reports", userId], {
    reportType,
    weight,
    reporterId: userId,
    accountAgeDays,
    emailVerified,
    createdAt: db.timestamp(),
  });

  // Update rate limiting counters
  await recordReport(userId, qrId);

  // Run collusion detection and update suspicious flag on the QR code doc
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

  notifyQrFollowers(qrId, "new_report", `New ${reportType} report on a QR you follow`, userId).catch(() => {});
  return getQrReportCounts(qrId);
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
