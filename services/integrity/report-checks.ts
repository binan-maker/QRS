import type { AccountTier } from "./types";
import { formatTimeRemaining, timeUntilWindowReset, isWithin24h, isWithinMs } from "./time-utils";
import { getAccountTier } from "./tiers";

const HOURLY_REPORT_WINDOW_MS = 3_600_000;
const HOURLY_REPORT_LIMIT_PER_USER = 100; // raised so per-QR limit is hit first
const HOURLY_REPORT_LIMIT_PER_QR = 20; // 20 interactions per QR per hour
const MAX_USER_BUCKETS = 200;
const MAX_PER_QR_ENTRIES = 50;

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
    if (userRateBuckets.size >= MAX_USER_BUCKETS) {
      const oldestKey = userRateBuckets.keys().next().value;
      if (oldestKey) userRateBuckets.delete(oldestKey);
    }
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
      const remainingMs = bucket.hourlyWindowStart + HOURLY_REPORT_WINDOW_MS - Date.now();
      throw new Error(
        `You've reported ${HOURLY_REPORT_LIMIT_PER_USER} times in the last hour. Please wait ${formatTimeRemaining(remainingMs)} before reporting again.`
      );
    }

    const perQr = bucket.perQr.get(qrId);
    if (perQr && isWithinMs(perQr.windowStart, HOURLY_REPORT_WINDOW_MS) && perQr.count >= HOURLY_REPORT_LIMIT_PER_QR) {
      const remainingMs = perQr.windowStart + HOURLY_REPORT_WINDOW_MS - Date.now();
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

  // Prune expired perQr entries if reaching threshold
  if (bucket.perQr.size >= MAX_PER_QR_ENTRIES) {
    for (const [key, val] of Array.from(bucket.perQr.entries())) {
      if (!isWithinMs(val.windowStart, HOURLY_REPORT_WINDOW_MS)) {
        bucket.perQr.delete(key);
      }
    }
  }

  const perQr = bucket.perQr.get(qrId);
  if (perQr && isWithinMs(perQr.windowStart, HOURLY_REPORT_WINDOW_MS)) {
    perQr.count += 1;
  } else {
    bucket.perQr.set(qrId, { windowStart: now, count: 1 });
  }
}
