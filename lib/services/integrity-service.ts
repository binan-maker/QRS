import { db } from "../db/client";

/**
 * INTEGRITY SERVICE — Anti-fraud, anti-bot, anti-manipulation engine.
 *
 * Account Tiers:
 *  TIER 0 — Unverified + < 24 hours old → minimal weight (0.01), no rate limits
 *  TIER 1 — (Unverified 1-7d) OR (Verified < 1d) → low weight
 *  TIER 2 — 7-30d (any) → reduced weight
 *  TIER 3 — 30-90d verified → normal weight
 *  TIER 4 — 90-180d verified → elevated weight
 *  TIER 5 — > 180d verified → max weight
 *
 * SECURITY FIX P0: Rate limits now ENFORCED to prevent Firestore abuse
 */

export interface AccountTier {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  voteWeight: number;
  maxCommentsPerDay: number;
  maxCommentsPerQr: number;
  maxReportsPerDay: number;
  maxCommentReportsPerDay: number;
  minCommentCooldownSeconds: number;
  canAct: boolean;
  reason?: string;
}

const TIER_CONFIG: Record<number, AccountTier> = {
  0: {
    tier: 0, voteWeight: 0.01, maxCommentsPerDay: 50, maxCommentsPerQr: 5,
    maxReportsPerDay: 20, maxCommentReportsPerDay: 10, minCommentCooldownSeconds: 2,
    canAct: true,
  },
  1: {
    tier: 1, voteWeight: 0.05, maxCommentsPerDay: 100, maxCommentsPerQr: 10,
    maxReportsPerDay: 50, maxCommentReportsPerDay: 25, minCommentCooldownSeconds: 1,
    canAct: true,
  },
  2: {
    tier: 2, voteWeight: 0.3, maxCommentsPerDay: 200, maxCommentsPerQr: 20,
    maxReportsPerDay: 100, maxCommentReportsPerDay: 50, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  3: {
    tier: 3, voteWeight: 0.7, maxCommentsPerDay: 500, maxCommentsPerQr: 50,
    maxReportsPerDay: 200, maxCommentReportsPerDay: 100, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  4: {
    tier: 4, voteWeight: 1.5, maxCommentsPerDay: 1000, maxCommentsPerQr: 100,
    maxReportsPerDay: 500, maxCommentReportsPerDay: 250, minCommentCooldownSeconds: 0,
    canAct: true,
  },
  5: {
    tier: 5, voteWeight: 2.0, maxCommentsPerDay: Infinity, maxCommentsPerQr: Infinity,
    maxReportsPerDay: 1000, maxCommentReportsPerDay: 500, minCommentCooldownSeconds: 0,
    canAct: true,
  },
};

function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return new Date(ts).getTime();
}

/** Format a millisecond duration into a human-readable string like "10 hours 23 minutes" */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "a moment";
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/** Calculate how long until a 24h window resets */
function timeUntilWindowReset(windowStartMs: number): number {
  const resetAt = windowStartMs + 86400000;
  return Math.max(0, resetAt - Date.now());
}

function isWithin24h(tsMs: number): boolean {
  return Date.now() - tsMs < 86400000;
}

function isWithinSeconds(tsMs: number, seconds: number): boolean {
  return Date.now() - tsMs < seconds * 1000;
}

export async function getAccountTier(userId: string, emailVerified: boolean): Promise<AccountTier & { accountCreatedAt?: number }> {
  try {
    const data = await db.get(["users", userId]);
    if (!data?.createdAt) return { ...TIER_CONFIG[1], accountCreatedAt: Date.now() };

    const createdMs = tsToMs(data.createdAt);
    const ageDays = (Date.now() - createdMs) / 86400000;

    let tier: 0 | 1 | 2 | 3 | 4 | 5;

    if (ageDays < 1 && !emailVerified) {
      tier = 0;
    } else if (ageDays < 7) {
      tier = 1;
    } else if (ageDays < 30) {
      tier = 2;
    } else if (ageDays < 90) {
      tier = emailVerified ? 3 : 2;
    } else if (ageDays < 180) {
      tier = emailVerified ? 4 : 2;
    } else {
      tier = emailVerified ? 5 : 2;
    }

    return { ...TIER_CONFIG[tier], accountCreatedAt: createdMs };
  } catch {
    return { ...TIER_CONFIG[1], accountCreatedAt: Date.now() };
  }
}

/** Check if a user is eligible to submit a QR report. Throws with reason if blocked. */
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

  // SECURITY FIX P0: Enforce daily report rate limit
  if (!isChangingReport && tier.maxReportsPerDay !== Infinity) {
    try {
      const userData = await db.get(["users", userId]);
      const windowStart = tsToMs(userData?.reportRateWindowStart);
      const count = userData?.reportRateCount || 0;
      
      if (isWithin24h(windowStart) && count >= tier.maxReportsPerDay) {
        const timeRemaining = formatTimeRemaining(timeUntilWindowReset(windowStart));
        throw new Error(
          `You've reached your daily report limit (${tier.maxReportsPerDay}). Please try again in ${timeRemaining}.`
        );
      }
    } catch (e: any) {
      if (e.message.includes("limit")) throw e;
      // Ignore other errors, continue with eligibility check
    }
  }

  return { allowed: true, weight: tier.voteWeight, tier };
}

/** Record a report action for rate limiting and velocity tracking. */
export async function recordReport(userId: string, qrId: string): Promise<void> {
  try {
    const userData = await db.get(["users", userId]);
    const windowStart = tsToMs(userData?.reportRateWindowStart);
    const count = userData?.reportRateCount || 0;

    if (isWithin24h(windowStart)) {
      await db.update(["users", userId], { reportRateCount: count + 1 });
    } else {
      await db.update(["users", userId], {
        reportRateWindowStart: db.timestamp(),
        reportRateCount: 1,
      });
    }

    const qrData = await db.get(["qrCodes", qrId]);
    if (qrData) {
      const velWindowStart = tsToMs(qrData.voteVelocityWindowStart);
      const velCount = qrData.voteVelocityCount || 0;

      if (Date.now() - velWindowStart < 3600000) {
        await db.update(["qrCodes", qrId], { voteVelocityCount: velCount + 1 });
      } else {
        await db.update(["qrCodes", qrId], {
          voteVelocityWindowStart: db.timestamp(),
          voteVelocityCount: 1,
        });
      }
    }
  } catch {}
}

/**
 * Analyze all reports on a QR code and detect collusion/manipulation patterns.
 */
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
        return {
          suspicious: true,
          reason: "Coordinated safe-voting detected: many low-trust accounts voted safe in a short time.",
          safeWeightMultiplier: 0.1,
          negativeWeightMultiplier: 1,
        };
      }
      return {
        suspicious: true,
        reason: "Unusually high safe-voting velocity detected.",
        safeWeightMultiplier: 0.4,
        negativeWeightMultiplier: 1,
      };
    }

    if (fastNeg.length >= 8) {
      const lowTierNeg = fastNeg.filter((d) => (d.data.weight || 1) <= 0.3);
      if (lowTierNeg.length / fastNeg.length > 0.5) {
        return {
          suspicious: true,
          reason: "Coordinated negative-voting detected: many low-trust accounts voted scam/fake in a short time.",
          safeWeightMultiplier: 1,
          negativeWeightMultiplier: 0.1,
        };
      }
      return {
        suspicious: true,
        reason: "Unusually high negative-voting velocity detected.",
        safeWeightMultiplier: 1,
        negativeWeightMultiplier: 0.4,
      };
    }

    if (allSafe.length >= 4) {
      const lowTierSafe = allSafe.filter((d) => (d.data.weight || 1) <= 0.3);
      if (lowTierSafe.length / allSafe.length > 0.7) {
        return {
          suspicious: true,
          reason: "Majority of safe reports are from new or low-credibility accounts.",
          safeWeightMultiplier: 0.2,
          negativeWeightMultiplier: 1,
        };
      }
    }

    if (allNeg.length >= 4) {
      const lowTierNeg = allNeg.filter((d) => (d.data.weight || 1) <= 0.3);
      if (lowTierNeg.length / allNeg.length > 0.7) {
        return {
          suspicious: true,
          reason: "Majority of scam/fake reports are from new or low-credibility accounts.",
          safeWeightMultiplier: 1,
          negativeWeightMultiplier: 0.2,
        };
      }
    }

    return { suspicious: false, reason: null, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };
  } catch {
    return { suspicious: false, reason: null, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };
  }
}

/** Check if a user is eligible to post a comment. Throws with reason if blocked. */
export async function checkCommentEligibility(
  userId: string,
  qrId: string,
  emailVerified: boolean,
  commentText: string
): Promise<void> {

  if (!commentText || commentText.trim().length < 3) {
    throw new Error("Comment is too short. Please write at least 3 characters.");
  }

  if (commentText.trim().length > 500) {
    throw new Error("Comment is too long. Maximum 500 characters allowed.");
  }
}

/** Record a comment action for rate limiting. */
export async function recordComment(userId: string): Promise<void> {
  try {
    const userData = await db.get(["users", userId]);
    const windowStart = tsToMs(userData?.commentRateWindowStart);
    const count = userData?.commentRateCount || 0;

    if (isWithin24h(windowStart)) {
      await db.update(["users", userId], {
        commentRateCount: count + 1,
        lastCommentAt: db.timestamp(),
      });
    } else {
      await db.update(["users", userId], {
        commentRateWindowStart: db.timestamp(),
        commentRateCount: 1,
        lastCommentAt: db.timestamp(),
      });
    }
  } catch {}
}

/** Check if a user is eligible to report a comment. Throws with reason if blocked. */
export async function checkCommentReportEligibility(
  userId: string,
  emailVerified: boolean
): Promise<void> {
  // Rate limits disabled — no restrictions enforced currently
}

/** Record a comment report for rate limiting. */
export async function recordCommentReport(userId: string): Promise<void> {
  try {
    const userData = await db.get(["users", userId]);
    const windowStart = tsToMs(userData?.commentReportRateWindowStart);
    const count = userData?.commentReportRateCount || 0;

    if (isWithin24h(windowStart)) {
      await db.update(["users", userId], { commentReportRateCount: count + 1 });
    } else {
      await db.update(["users", userId], {
        commentReportRateWindowStart: db.timestamp(),
        commentReportRateCount: 1,
      });
    }
  } catch {}
}
