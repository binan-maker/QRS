import { db } from "../../lib/db/client";
import type { AccountTier } from "./types";
import { tsToMs, formatTimeRemaining, timeUntilWindowReset, isWithin24h, isWithinMs } from "./time-utils";
import { getAccountTier } from "./tiers";
import { COLLECTIONS } from "../../shared/constants/collections";

const HOURLY_REPORT_WINDOW_MS = 3_600_000;
const HOURLY_REPORT_LIMIT_PER_USER = 100; // raised so per-QR limit is hit first
const HOURLY_REPORT_LIMIT_PER_QR   = 20;  // 20 interactions per QR per hour

interface RateBucket {
  dailyWindowStart: number;
  dailyCount: number;
  hourlyWindowStart: number;
  hourlyCount: number;
  perQr: Map<string, { windowStart: number; count: number }>;
}

const userRateBuckets = new Map<string, RateBucket>();

function getOrCreateBucket(userId: string): RateBucket {
  let bucket = userRateBuckets.get(userId);
  if (!bucket) {
    bucket = {
      dailyWindowStart: 0,
      dailyCount: 0,
      hourlyWindowStart: 0,
      hourlyCount: 0,
      perQr: new Map(),
    };
    userRateBuckets.set(userId, bucket);
  }
  return bucket;
}

export async function checkReportEligibility(
  userId: string,
  qrId: string,
  emailVerified: boolean,
  isChangingReport?: boolean
): Promise<{ allowed: true; weight: number; tier: AccountTier } | never> {

  const tierResult = await getAccountTier(userId, emailVerified);
  const tier = tierResult as AccountTier;

  if (!isChangingReport) {
    const bucket = getOrCreateBucket(userId);

    if (tier.maxReportsPerDay !== Infinity) {
      if (isWithin24h(bucket.dailyWindowStart) && bucket.dailyCount >= tier.maxReportsPerDay) {
        const timeRemaining = formatTimeRemaining(timeUntilWindowReset(bucket.dailyWindowStart));
        throw new Error(
          `You've reached your daily report limit (${tier.maxReportsPerDay}). Please try again in ${timeRemaining}.`
        );
      }
    }

    if (isWithinMs(bucket.hourlyWindowStart, HOURLY_REPORT_WINDOW_MS) && bucket.hourlyCount >= HOURLY_REPORT_LIMIT_PER_USER) {
      const remainingMs = (bucket.hourlyWindowStart + HOURLY_REPORT_WINDOW_MS) - Date.now();
      throw new Error(
        `You've reported ${HOURLY_REPORT_LIMIT_PER_USER} times in the last hour. Please wait ${formatTimeRemaining(remainingMs)} before reporting again.`
      );
    }

    const perQr = bucket.perQr.get(qrId);
    if (perQr && isWithinMs(perQr.windowStart, HOURLY_REPORT_WINDOW_MS) && perQr.count >= HOURLY_REPORT_LIMIT_PER_QR) {
      const remainingMs = (perQr.windowStart + HOURLY_REPORT_WINDOW_MS) - Date.now();
      throw new Error(
        `You've already reported this QR code ${HOURLY_REPORT_LIMIT_PER_QR} times in the last hour. Please wait ${formatTimeRemaining(remainingMs)}.`
      );
    }
  }

  return { allowed: true, weight: tier.voteWeight, tier };
}

export async function recordReport(userId: string, qrId: string): Promise<void> {
  const now = Date.now();
  const bucket = getOrCreateBucket(userId);

  if (isWithin24h(bucket.dailyWindowStart)) {
    bucket.dailyCount += 1;
  } else {
    bucket.dailyWindowStart = now;
    bucket.dailyCount = 1;
  }

  if (isWithinMs(bucket.hourlyWindowStart, HOURLY_REPORT_WINDOW_MS)) {
    bucket.hourlyCount += 1;
  } else {
    bucket.hourlyWindowStart = now;
    bucket.hourlyCount = 1;
  }

  const perQr = bucket.perQr.get(qrId);
  if (perQr && isWithinMs(perQr.windowStart, HOURLY_REPORT_WINDOW_MS)) {
    perQr.count += 1;
  } else {
    bucket.perQr.set(qrId, { windowStart: now, count: 1 });
  }
}

export async function analyzeReportsForCollusion(qrId: string): Promise<{
  suspicious: boolean;
  reason: string | null;
  safeWeightMultiplier: number;
  negativeWeightMultiplier: number;
}> {
  try {
    const { docs } = await db.query([COLLECTIONS.QR_CODES, qrId, COLLECTIONS.REPORTS]);
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
