import { db } from "../db";

/**
 * INTEGRITY SERVICE — Anti-fraud, anti-bot, anti-manipulation engine.
 *
 * Account Tiers:
 *  TIER 0 — Unverified + < 24 hours old → BLOCKED from all social actions
 *  TIER 1 — (Unverified 1-7d) OR (Verified < 1d) → minimal weight, 1 action/day
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
    canAct: false, reason: "Your account is too new. Please wait 24 hours before participating.",
  },
  1: {
    tier: 1, voteWeight: 0.05, maxCommentsPerDay: 1, maxCommentsPerQr: 1,
    maxReportsPerDay: 1, maxCommentReportsPerDay: 2, minCommentCooldownSeconds: 300,
    canAct: true,
  },
  2: {
    tier: 2, voteWeight: 0.3, maxCommentsPerDay: 3, maxCommentsPerQr: 2,
    maxReportsPerDay: 3, maxCommentReportsPerDay: 5, minCommentCooldownSeconds: 120,
    canAct: true,
  },
  3: {
    tier: 3, voteWeight: 0.7, maxCommentsPerDay: 10, maxCommentsPerQr: 5,
    maxReportsPerDay: 5, maxCommentReportsPerDay: 10, minCommentCooldownSeconds: 60,
    canAct: true,
  },
  4: {
    tier: 4, voteWeight: 1.5, maxCommentsPerDay: 20, maxCommentsPerQr: 10,
    maxReportsPerDay: 10, maxCommentReportsPerDay: 20, minCommentCooldownSeconds: 30,
    canAct: true,
  },
  5: {
    tier: 5, voteWeight: 2.0, maxCommentsPerDay: 30, maxCommentsPerQr: 15,
    maxReportsPerDay: 15, maxCommentReportsPerDay: 30, minCommentCooldownSeconds: 15,
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

export async function getAccountTier(userId: string, emailVerified: boolean): Promise<AccountTier> {
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

    return TIER_CONFIG[tier];
  } catch {
    return TIER_CONFIG[0];
  }
}

function isWithin24h(tsMs: number): boolean {
  return Date.now() - tsMs < 86400000;
}

function isWithinSeconds(tsMs: number, seconds: number): boolean {
  return Date.now() - tsMs < seconds * 1000;
}

/** Check if a user is eligible to submit a QR report. Throws with reason if blocked. */
export async function checkReportEligibility(
  userId: string,
  qrId: string,
  emailVerified: boolean,
  qrOwnerId?: string
): Promise<{ allowed: true; weight: number; tier: AccountTier } | never> {

  // Block QR owner from voting on their own QR
  if (qrOwnerId && qrOwnerId === userId) {
    throw new Error("You cannot report your own QR code.");
  }

  const tier = await getAccountTier(userId, emailVerified);

  if (!tier.canAct) {
    throw new Error(tier.reason || "You are not eligible to submit reports yet.");
  }

  const userData = await db.get(["users", userId]);
  if (!userData) throw new Error("User not found.");

  // Check daily report rate limit
  const windowStart = tsToMs(userData.reportRateWindowStart);
  const count = userData.reportRateCount || 0;

  if (isWithin24h(windowStart)) {
    if (count >= tier.maxReportsPerDay) {
      throw new Error(
        `You have reached your daily report limit (${tier.maxReportsPerDay}). Please try again tomorrow.`
      );
    }
  }

  // Check global QR vote velocity — prevent vote stuffing on a single QR
  const qrData = await db.get(["qrCodes", qrId]);
  if (qrData) {
    const velWindowStart = tsToMs(qrData.voteVelocityWindowStart);
    const velCount = qrData.voteVelocityCount || 0;

    if (Date.now() - velWindowStart < 3600000) {
      // Max 30 votes per QR per hour across all users
      if (velCount >= 30) {
        throw new Error(
          "This QR code is receiving too many reports right now. Please try again later."
        );
      }
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

    // Update QR vote velocity
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
 * Returns a suspicious flag and a multiplier to apply to the suspicious vote direction.
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

    // Group by type
    const allSafe = docs.filter((d) => d.data.reportType === "safe");
    const allNeg = docs.filter((d) => d.data.reportType !== "safe");

    // Recent votes within last 2 hours
    const recentSafe = allSafe.filter((d) => tsToMs(d.data.createdAt) > twoHoursAgo);
    const recentNeg = allNeg.filter((d) => tsToMs(d.data.createdAt) > twoHoursAgo);
    const recentVeryFast = docs.filter((d) => tsToMs(d.data.createdAt) > oneHourAgo);

    // Pattern 1: Vote bombing — too many votes in 1 hour (> 15 same direction in 1 hour)
    const fastSafe = allSafe.filter((d) => tsToMs(d.data.createdAt) > oneHourAgo);
    const fastNeg = allNeg.filter((d) => tsToMs(d.data.createdAt) > oneHourAgo);

    if (fastSafe.length >= 8) {
      // Too many "safe" votes in 1 hour — likely coordinated
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

    // Pattern 2: Low-tier domination — if > 70% of safe votes are from low-tier accounts
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

  const tier = await getAccountTier(userId, emailVerified);

  if (!tier.canAct) {
    throw new Error(tier.reason || "You are not eligible to comment yet.");
  }

  if (!commentText || commentText.trim().length < 3) {
    throw new Error("Comment is too short. Please write at least 3 characters.");
  }

  if (commentText.trim().length > 500) {
    throw new Error("Comment is too long. Maximum 500 characters allowed.");
  }

  const userData = await db.get(["users", userId]);
  if (!userData) throw new Error("User not found.");

  // Cooldown check — minimum time between any two comments
  const lastCommentMs = tsToMs(userData.lastCommentAt);
  if (lastCommentMs > 0 && isWithinSeconds(lastCommentMs, tier.minCommentCooldownSeconds)) {
    const remaining = Math.ceil(
      tier.minCommentCooldownSeconds - (Date.now() - lastCommentMs) / 1000
    );
    throw new Error(
      `Please wait ${remaining} more second${remaining === 1 ? "" : "s"} before commenting again.`
    );
  }

  // Daily comment rate limit across all QR codes
  const dailyWindowStart = tsToMs(userData.commentRateWindowStart);
  const dailyCount = userData.commentRateCount || 0;

  if (isWithin24h(dailyWindowStart) && dailyCount >= tier.maxCommentsPerDay) {
    throw new Error(
      `You have reached your daily comment limit (${tier.maxCommentsPerDay}). Please try again tomorrow.`
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
      throw new Error(
        `You have already commented ${tier.maxCommentsPerQr} time${tier.maxCommentsPerQr === 1 ? "" : "s"} on this QR code today. Please come back tomorrow.`
      );
    }
  } catch (e: any) {
    // If this check fails (query issue), don't block — only throw if it's our own error
    if (e?.message?.includes("already commented")) throw e;
  }

  // Duplicate comment detection — same exact text in last 60 minutes
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
      throw new Error("You have already posted this comment recently. Please write something different.");
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
  const tier = await getAccountTier(userId, emailVerified);

  if (!tier.canAct) {
    throw new Error(tier.reason || "You are not eligible to report comments yet.");
  }

  const userData = await db.get(["users", userId]);
  if (!userData) throw new Error("User not found.");

  const windowStart = tsToMs(userData.commentReportRateWindowStart);
  const count = userData.commentReportRateCount || 0;

  if (isWithin24h(windowStart) && count >= tier.maxCommentReportsPerDay) {
    throw new Error(
      `You have reached your daily comment report limit (${tier.maxCommentReportsPerDay}). Please try again tomorrow.`
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
