import { db } from "../db";
import { notifyQrFollowers } from "./notification-service";

async function calculateReporterWeight(userId: string | null, emailVerified: boolean): Promise<number> {
  if (!userId) return 0.3;
  let weight = 1.0;
  if (emailVerified) weight += 0.3;
  try {
    const data = await db.get(["users", userId]);
    if (data?.createdAt) {
      const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const ageDays = (Date.now() - d.getTime()) / 86400000;
      if (ageDays >= 90) weight += 0.3;
      else if (ageDays >= 30) weight += 0.2;
    }
  } catch {}
  return Math.min(weight, 1.8);
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
  const weight = await calculateReporterWeight(userId, emailVerified);
  await db.set(["qrCodes", qrId, "reports", userId], {
    reportType, weight, reporterId: userId, createdAt: db.timestamp(),
  });
  notifyQrFollowers(qrId, "new_report", `New ${reportType} report on a QR you follow`, userId).catch(() => {});
  return getQrReportCounts(qrId);
}

export function subscribeToQrReports(
  qrId: string,
  onUpdate: (counts: Record<string, number>) => void
): () => void {
  return db.onQuery(["qrCodes", qrId, "reports"], {}, (docs) => {
    const counts: Record<string, number> = {};
    for (const d of docs) {
      const { reportType } = d.data;
      counts[reportType] = (counts[reportType] || 0) + 1;
    }
    onUpdate(counts);
  });
}
