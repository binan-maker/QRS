import { db } from "../db";

/**
 * INTEGRITY SERVICE — Anti-fraud, anti-bot, anti-manipulation engine.
 *
 * Account Tiers:
 *  TIER 0 — Unverified + < 24 hours old → BLOCKED from all social actions
 *  TIER 1 — (Unverified 1-7d) OR (Verified < 1d) → minimal weight, very limited actions
 *  TIER 2 — 7-30d (any) → reduced weight, limited actions
 *  TIER 3 — 30-90d verified → normal weight
 *  TIER 4 — 90-180d verified → elevated weight
 *  TIER 5 — > 180d verified → max weight
 *
 * Rate limits, collusion detection, velocity caps, and duplicate comment detection
 * are all enforced here before any social action is persisted.
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
    tier: 0, voteWeight: 0, maxCommentsPerDay: 0, maxCommentsPerQr: 0,
    maxReportsPerDay: 0, maxCommentReportsPerDay: 0, minCommentCooldownSeconds: 0,
    canAct: false,
    reason: "TIER_0_BLOCKED",
  },
  1: {
    tier: 1, voteWeight: 0.05, maxCommentsPerDay: 3, maxCommentsPerQr: 1,
    maxReportsPerDay: 2, maxCommentReportsPerDay: 2, minCommentCooldownSeconds: 180,
    canAct: true,
  },
  2: {
    tier: 2, voteWeight: 0.3, maxCommentsPerDay: 8, maxCommentsPerQr: 3,
    maxReportsPerDay: 5, maxCommentReportsPerDay: 5, minCommentCooldownSeconds: 90,
    canAct: true,
  },
  3: {
    tier: 3, voteWeight: 0.7, maxCommentsPerDay: 15, maxCommentsPerQr: 5,
    maxReportsPerDay: 8, maxCommentReportsPerDay: 10, minCommentCooldownSeconds: 45,
    canAct: true,
  },
  4: {
    tier: 4, voteWeight: 1.5, maxCommentsPerDay: 25, maxCommentsPerQr: 10,
    maxReportsPerDay: 12, maxCommentReportsPerDay: 20, minCommentCooldownSeconds: 20,
    canAct: true,
  },
  5: {
    tier: 5, voteWeight: 2.0, maxCommentsPerDay: 40, maxCommentsPerQr: 15,
    maxReportsPerDay: 15, maxCommentReportsPerDay: 30, minCommentCooldownSeconds: 10,
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
    if (!data?.createdAt) return TIER_CONFIG[0];

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
    return TIER_CONFIG[0];
  }
}

/** Build a human-readable Tier 0 block message showing exact time remaining */
function buildTier0Message(accountCreatedAt: number): string {
  const unlocksAt = accountCreatedAt + 86400000;
  const remainingMs = Math.max(0, unlocksAt - Date.now());
  const remaining = formatTimeRemaining(remainingMs);
  return (
    `Your account is less than 24 hours old and cannot participate yet.\n\n` +
    `You'll be able to comment and report in ${remaining}.\n\n` +
    `This restriction protects our community from spam and fake reports. ` +
    `Verify your email to get started faster!`
  );
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

  if (!tierResult.canAct) {
    const msg = buildTier0Message(tierResult.accountCreatedAt ?? Date.now());
    throw new Error(msg);
  }

  const tier = tierResult as AccountTier;

  const userData = await db.get(["users", userId]);
  if (!userData) throw new Error("User not found.");

  if (!isChangingReport) {
    const windowStart = tsToMs(userData.reportRateWindowStart);
    const count = userData.reportRateCount || 0;

    if (isWithin24h(windowStart) && count >= tier.maxReportsPerDay) {
      const remaining = formatTimeRemaining(timeUntilWindowReset(windowStart));
      throw new Error(
        `You've used all ${tier.maxReportsPerDay} report${tier.maxReportsPerDay === 1 ? "" : "s"} for today.\n\n` +
        `Your limit resets in ${remaining}.\n\n` +
        `This daily limit helps keep our trust system fair and prevents manipulation.`
      );
    }
  }

  const qrData = await db.get(["qrCodes", qrId]);
  if (qrData) {
    const velWindowStart = tsToMs(qrData.voteVelocityWindowStart);
    const velCount = qrData.voteVelocityCount || 0;

    if (Date.now() - velWindowStart < 3600000 && velCount >= 30) {
      const resetMs = Math.max(0, (velWindowStart + 3600000) - Date.now());
      throw new Error(
        `This QR code is receiving too many reports right now.\n\n` +
        `Please try again in ${formatTimeRemaining(resetMs)}. This prevents coordinated manipulation.`
      );
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
    if (docs.length < 3) {
      return { suspicious: false, reason: null, safeWeightMultiplier: 1, negativeWeightMultiplier: 1 };
    }

    const now = Date.now();
    const twoHoursAgo = now - 7200000;
    const oneHourAgo = now - 3600000;

    const allSafe = docs.filter((d) => d.data.reportType === "safe");
    const allNeg = docs.filter((d) => d.data.reportType !== "safe");

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

  const tierResult = await getAccountTier(userId, emailVerified);

  if (!tierResult.canAct) {
    const msg = buildTier0Message(tierResult.accountCreatedAt ?? Date.now());
    throw new Error(msg);
  }

  const tier = tierResult as AccountTier;

  if (!commentText || commentText.trim().length < 3) {
    throw new Error("Comment is too short. Please write at least 3 characters.");
  }

  if (commentText.trim().length > 500) {
    throw new Error("Comment is too long. Maximum 500 characters allowed.");
  }

  const userData = await db.get(["users", userId]);
  if (!userData) throw new Error("User not found.");

  // Cooldown check
  const lastCommentMs = tsToMs(userData.lastCommentAt);
  if (lastCommentMs > 0 && isWithinSeconds(lastCommentMs, tier.minCommentCooldownSeconds)) {
    const remainingMs = (lastCommentMs + tier.minCommentCooldownSeconds * 1000) - Date.now();
    const remaining = formatTimeRemaining(Math.max(0, remainingMs));
    throw new Error(
      `Please wait ${remaining} before posting another comment.\n\n` +
      `This cooldown prevents spam and keeps conversations healthy.`
    );
  }

  // Daily comment rate limit
  const dailyWindowStart = tsToMs(userData.commentRateWindowStart);
  const dailyCount = userData.commentRateCount || 0;

  if (isWithin24h(dailyWindowStart) && dailyCount >= tier.maxCommentsPerDay) {
    const remaining = formatTimeRemaining(timeUntilWindowReset(dailyWindowStart));
    throw new Error(
      `You've reached your daily comment limit (${tier.maxCommentsPerDay} comment${tier.maxCommentsPerDay === 1 ? "" : "s"}).\n\n` +
      `Your limit resets in ${remaining}.\n\n` +
      `Verify your email or use the app longer to unlock higher limits.`
    );
  }

  // Per-QR comment limit
  try {
    const { docs } = await db.query(["users", userId, "comments"], {
      where: [{ field: "qrCodeId", op: "==", value: qrId }],
    });
    const commentsOnThisQr = docs.filter((d) => {
      const createdMs = tsToMs(d.data.createdAt);
      return isWithin24h(createdMs);
    }).length;

    if (commentsOnThisQr >= tier.maxCommentsPerQr) {
      const oldest = docs
        .filter((d) => isWithin24h(tsToMs(d.data.createdAt)))
        .sort((a, b) => tsToMs(a.data.createdAt) - tsToMs(b.data.createdAt))[0];
      let remaining = "tomorrow";
      if (oldest) {
        const resetMs = timeUntilWindowReset(tsToMs(oldest.data.createdAt));
        remaining = `in ${formatTimeRemaining(resetMs)}`;
      }
      throw new Error(
        `You've already commented ${tier.maxCommentsPerQr} time${tier.maxCommentsPerQr === 1 ? "" : "s"} on this QR code today.\n\n` +
        `You can comment again ${remaining}.`
      );
    }
  } catch (e: any) {
    if (e?.message?.includes("already commented")) throw e;
  }

  // Duplicate comment detection
  try {
    const { docs } = await db.query(["users", userId, "comments"], {
      orderBy: { field: "createdAt", direction: "desc" },
      limit: 10,
    });
    const oneHourAgo = Date.now() - 3600000;
    const isDuplicate = docs.some((d) => {
      const createdMs = tsToMs(d.data.createdAt);
      return createdMs > oneHourAgo && d.data.text?.trim() === commentText.trim();
    });

    if (isDuplicate) {
      throw new Error("You've already posted this exact comment recently. Please write something different.");
    }
  } catch (e: any) {
    if (e?.message?.includes("already posted")) throw e;
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
  const tierResult = await getAccountTier(userId, emailVerified);

  if (!tierResult.canAct) {
    const msg = buildTier0Message(tierResult.accountCreatedAt ?? Date.now());
    throw new Error(msg);
  }

  const tier = tierResult as AccountTier;

  const userData = await db.get(["users", userId]);
  if (!userData) throw new Error("User not found.");

  const windowStart = tsToMs(userData.commentReportRateWindowStart);
  const count = userData.commentReportRateCount || 0;

  if (isWithin24h(windowStart) && count >= tier.maxCommentReportsPerDay) {
    const remaining = formatTimeRemaining(timeUntilWindowReset(windowStart));
    throw new Error(
      `You've reached your daily comment report limit (${tier.maxCommentReportsPerDay}).\n\n` +
      `Your limit resets in ${remaining}.\n\n` +
      `This limit prevents abuse of the reporting system.`
    );
  }
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
