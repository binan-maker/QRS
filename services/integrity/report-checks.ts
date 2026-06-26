import { db } from "@/lib/db/client";
import type { AccountTier } from "./types";
import { tsToMs, formatTimeRemaining, timeUntilWindowReset, isWithin24h, isWithinMs } from "./time-utils";
import { getAccountTier } from "./tiers";

const HOURLY_REPORT_WINDOW_MS = 3_600_000;
const HOURLY_REPORT_LIMIT_PER_USER = 100; // raised so per-QR limit is hit first
const HOURLY_REPORT_LIMIT_PER_QR   = 20;  // 20 interactions per QR per hour

export async function checkReportEligibility(
  userId: string,
  qrId: string,
  emailVerified: boolean,
  qrOwnerId?: string,
  isChangingReport?: boolean
): Promise<{ allowed: true; weight: number; tier: AccountTier } | never> {

  if (qrOwnerId && qrOwnerId === userId) {
    throw new Error("You cannot report your own QR code.");
  }

  const tierResult = await getAccountTier(userId, emailVerified);
  const tier = tierResult as AccountTier;

  if (!isChangingReport) {
    try {
      const userData = await db.get(["users", userId]);

      if (tier.maxReportsPerDay !== Infinity) {
        const windowStart = tsToMs(userData?.reportRateWindowStart);
        const count = userData?.reportRateCount || 0;
        if (isWithin24h(windowStart) && count >= tier.maxReportsPerDay) {
          const timeRemaining = formatTimeRemaining(timeUntilWindowReset(windowStart));
          throw new Error(
            `You've reached your daily report limit (${tier.maxReportsPerDay}). Please try again in ${timeRemaining}.`
          );
        }
      }

      const hourlyWindowStart = tsToMs(userData?.reportHourlyWindowStart);
      const hourlyCount = userData?.reportHourlyCount || 0;
      if (isWithinMs(hourlyWindowStart, HOURLY_REPORT_WINDOW_MS) && hourlyCount >= HOURLY_REPORT_LIMIT_PER_USER) {
        const remainingMs = (hourlyWindowStart + HOURLY_REPORT_WINDOW_MS) - Date.now();
        throw new Error(
          `You've reported ${HOURLY_REPORT_LIMIT_PER_USER} times in the last hour. Please wait ${formatTimeRemaining(remainingMs)} before reporting again.`
        );
      }

      try {
        const perQr = await db.get(["users", userId, "reportLog", qrId]);
        const perQrWindowStart = tsToMs(perQr?.windowStart);
        const perQrCount = perQr?.count || 0;
        if (isWithinMs(perQrWindowStart, HOURLY_REPORT_WINDOW_MS) && perQrCount >= HOURLY_REPORT_LIMIT_PER_QR) {
          const remainingMs = (perQrWindowStart + HOURLY_REPORT_WINDOW_MS) - Date.now();
          throw new Error(
            `You've already reported this QR code ${HOURLY_REPORT_LIMIT_PER_QR} times in the last hour. Please wait ${formatTimeRemaining(remainingMs)}.`
          );
        }
      } catch (e: any) {
        if (e.message?.includes("times in the last hour")) throw e;
      }
    } catch (e: any) {
      if (e.message?.includes("limit") || e.message?.includes("times in the last hour") || e.message?.includes("Please wait")) {
        throw e;
      }
    }
  }

  return { allowed: true, weight: tier.voteWeight, tier };
}

export async function recordReport(userId: string, qrId: string): Promise<void> {
  try {
    const userData = await db.get(["users", userId]);

    const dailyWindowStart = tsToMs(userData?.reportRateWindowStart);
    const dailyCount = userData?.reportRateCount || 0;
    const hourlyWindowStart = tsToMs(userData?.reportHourlyWindowStart);
    const hourlyCount = userData?.reportHourlyCount || 0;

    const updates: Record<string, unknown> = {};

    if (isWithin24h(dailyWindowStart)) {
      updates.reportRateCount = dailyCount + 1;
    } else {
      updates.reportRateWindowStart = db.timestamp();
      updates.reportRateCount = 1;
    }

    if (isWithinMs(hourlyWindowStart, HOURLY_REPORT_WINDOW_MS)) {
      updates.reportHourlyCount = hourlyCount + 1;
    } else {
      updates.reportHourlyWindowStart = db.timestamp();
      updates.reportHourlyCount = 1;
    }

    await db.update(["users", userId], updates);

    try {
      const perQr = await db.get(["users", userId, "reportLog", qrId]);
      const perQrWindowStart = tsToMs(perQr?.windowStart);
      const perQrCount = perQr?.count || 0;
      if (isWithinMs(perQrWindowStart, HOURLY_REPORT_WINDOW_MS)) {
        await db.set(["users", userId, "reportLog", qrId], {
          count: perQrCount + 1,
          windowStart: perQr?.windowStart ?? db.timestamp(),
          updatedAt: db.timestamp(),
        });
      } else {
        await db.set(["users", userId, "reportLog", qrId], {
          count: 1, windowStart: db.timestamp(), updatedAt: db.timestamp(),
        });
      }
    } catch {}

    const qrData = await db.get(["qrCodes", qrId]);
    if (qrData) {
      const velWindowStart = tsToMs(qrData.voteVelocityWindowStart);
      const velCount = qrData.voteVelocityCount || 0;
      if (Date.now() - velWindowStart < 3600000) {
        await db.update(["qrCodes", qrId], { voteVelocityCount: velCount + 1 });
      } else {
        await db.update(["qrCodes", qrId], {
          voteVelocityWindowStart: db.timestamp(), voteVelocityCount: 1,
        });
      }
    }
  } catch {}
}

export async function analyzeReportsForCollusion(qrId: string): Promise<{
  suspicious: boolean;
  reason: string | null;
  safeWeightMultiplier: number;
  negativeWeightMultiplier: number;
}> {
  try {
    const { docs } = await db.query(["qrCodes", qrId, "reports"]);
    const activeDocs = docs.filter((d) => !d.data.userRemoved);
    if (activeDocs.length < 3) {
      return { suspicious: false, reason: null, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };
    }

    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const allSafe = activeDocs.filter((d) => d.data.reportType === "safe");
    const allNeg = activeDocs.filter((d) => d.data.reportType !== "safe");
    const fastSafe = allSafe.filter((d) => tsToMs(d.data.createdAt) > oneHourAgo);
    const fastNeg = allNeg.filter((d) => tsToMs(d.data.createdAt) > oneHourAgo);

    if (fastSafe.length >= 8) {
      const lowTierSafe = fastSafe.filter((d) => (d.data.weight || 1) <= 0.3);
      if (lowTierSafe.length / fastSafe.length > 0.5) {
        return { suspicious: true, reason: "Coordinated safe-voting detected: many low-trust accounts voted safe in a short time.", safeWeightMultiplier: 0.1, negativeWeightMultiplier: 1 };
      }
      return { suspicious: true, reason: "Unusually high safe-voting velocity detected.", safeWeightMultiplier: 0.4, negativeWeightMultiplier: 1 };
    }

    if (fastNeg.length >= 8) {
      const lowTierNeg = fastNeg.filter((d) => (d.data.weight || 1) <= 0.3);
      if (lowTierNeg.length / fastNeg.length > 0.5) {
        return { suspicious: true, reason: "Coordinated negative-voting detected: many low-trust accounts voted scam/fake in a short time.", safeWeightMultiplier: 1, negativeWeightMultiplier: 0.1 };
      }
      return { suspicious: true, reason: "Unusually high negative-voting velocity detected.", safeWeightMultiplier: 1, negativeWeightMultiplier: 0.4 };
    }

    if (allSafe.length >= 4) {
      const lowTierSafe = allSafe.filter((d) => (d.data.weight || 1) <= 0.3);
      if (lowTierSafe.length / allSafe.length > 0.7) {
        return { suspicious: true, reason: "Majority of safe reports are from new or low-credibility accounts.", safeWeightMultiplier: 0.2, negativeWeightMultiplier: 1 };
      }
    }

    if (allNeg.length >= 4) {
      const lowTierNeg = allNeg.filter((d) => (d.data.weight || 1) <= 0.3);
      if (lowTierNeg.length / allNeg.length > 0.7) {
        return { suspicious: true, reason: "Majority of scam/fake reports are from new or low-credibility accounts.", safeWeightMultiplier: 1, negativeWeightMultiplier: 0.2 };
      }
    }

    return { suspicious: false, reason: null, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };
  } catch {
    return { suspicious: false, reason: null, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };
  }
}
