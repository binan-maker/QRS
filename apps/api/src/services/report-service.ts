// ═══════════════════════════════════════════════════════════════════════════════
// SERVER-SIDE REPORT SERVICE
// ───────────────────────────────────────────────────────────────────────────────
// Node-safe replacement for @/services/moderation/report-service.
// Uses getAdminDb() directly — never imports react-native.
// ═══════════════════════════════════════════════════════════════════════════════

import { getAdminDb, admin } from "../lib/firebase-admin";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountTier {
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  voteWeight: number;
  maxReportsPerDay: number;
  canAct: boolean;
}

const TIER_CONFIG: Record<number, AccountTier> = {
  0: { tier: 0, voteWeight: 0.01, maxReportsPerDay: 20,   canAct: true },
  1: { tier: 1, voteWeight: 0.05, maxReportsPerDay: 50,   canAct: true },
  2: { tier: 2, voteWeight: 0.3,  maxReportsPerDay: 100,  canAct: true },
  3: { tier: 3, voteWeight: 0.7,  maxReportsPerDay: 200,  canAct: true },
  4: { tier: 4, voteWeight: 1.5,  maxReportsPerDay: 500,  canAct: true },
  5: { tier: 5, voteWeight: 2.0,  maxReportsPerDay: 1000, canAct: true },
};

const HOURLY_REPORT_WINDOW_MS   = 3_600_000;
const HOURLY_REPORT_LIMIT_PER_USER = 100;
const HOURLY_REPORT_LIMIT_PER_QR   = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return new Date(ts).getTime();
}

function isWithin24h(tsMs: number): boolean {
  return Date.now() - tsMs < 86_400_000;
}

function isWithinMs(tsMs: number, ms: number): boolean {
  return Date.now() - tsMs < ms;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "a moment";
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

// ─── Account tier (server-side, no react-native) ──────────────────────────────

async function getAccountTier(userId: string, emailVerified: boolean): Promise<AccountTier> {
  try {
    const db = getAdminDb();
    if (!db) return TIER_CONFIG[1];
    const data = await db.collection("users").doc(userId).get();
    const userData = data.data() as any;
    if (!userData?.createdAt) return TIER_CONFIG[1];

    const createdMs = tsToMs(userData.createdAt);
    const ageDays = (Date.now() - createdMs) / 86_400_000;

    let tier: 0 | 1 | 2 | 3 | 4 | 5;
    if (ageDays < 1 && !emailVerified)   tier = 0;
    else if (ageDays < 7)                tier = 1;
    else if (ageDays < 30)               tier = 2;
    else if (ageDays < 90)               tier = emailVerified ? 3 : 2;
    else if (ageDays < 180)              tier = emailVerified ? 4 : 2;
    else                                 tier = emailVerified ? 5 : 2;

    return TIER_CONFIG[tier];
  } catch {
    return TIER_CONFIG[1];
  }
}

// ─── Rate-limit check ─────────────────────────────────────────────────────────

async function checkReportEligibility(
  userId: string,
  qrId: string,
  emailVerified: boolean,
  qrOwnerId?: string,
  isChangingReport?: boolean,
): Promise<{ allowed: true; weight: number; tier: AccountTier }> {
  if (qrOwnerId && qrOwnerId === userId) {
    throw new Error("You cannot report your own QR code.");
  }

  const tier = await getAccountTier(userId, emailVerified);

  if (!isChangingReport) {
    const db = getAdminDb();
    if (db) {
      try {
        const userSnap = await db.collection("users").doc(userId).get();
        const userData = userSnap.data() as any;

        if (tier.maxReportsPerDay !== Infinity) {
          const windowStart = tsToMs(userData?.reportRateWindowStart);
          const count = userData?.reportRateCount || 0;
          if (isWithin24h(windowStart) && count >= tier.maxReportsPerDay) {
            const remainingMs = windowStart + 86_400_000 - Date.now();
            throw new Error(
              `Daily report limit reached (${tier.maxReportsPerDay}). Try again in ${formatTimeRemaining(remainingMs)}.`,
            );
          }
        }

        const hourlyWs = tsToMs(userData?.reportHourlyWindowStart);
        const hourlyCount = userData?.reportHourlyCount || 0;
        if (isWithinMs(hourlyWs, HOURLY_REPORT_WINDOW_MS) && hourlyCount >= HOURLY_REPORT_LIMIT_PER_USER) {
          const remainingMs = hourlyWs + HOURLY_REPORT_WINDOW_MS - Date.now();
          throw new Error(
            `Hourly report limit reached. Try again in ${formatTimeRemaining(remainingMs)}.`,
          );
        }

        try {
          const perQrSnap = await db
            .collection("users").doc(userId)
            .collection("reportLog").doc(qrId).get();
          const perQr = perQrSnap.data() as any;
          const perQrWs = tsToMs(perQr?.windowStart);
          const perQrCount = perQr?.count || 0;
          if (isWithinMs(perQrWs, HOURLY_REPORT_WINDOW_MS) && perQrCount >= HOURLY_REPORT_LIMIT_PER_QR) {
            const remainingMs = perQrWs + HOURLY_REPORT_WINDOW_MS - Date.now();
            throw new Error(
              `You've reported this QR ${HOURLY_REPORT_LIMIT_PER_QR} times in the last hour. Try again in ${formatTimeRemaining(remainingMs)}.`,
            );
          }
        } catch (e: any) {
          if (e.message?.includes("times in the last hour")) throw e;
        }
      } catch (e: any) {
        if (e.message?.includes("limit") || e.message?.includes("times in the last hour")) throw e;
      }
    }
  }

  return { allowed: true, weight: tier.voteWeight, tier };
}

// ─── Record a report in user stats ───────────────────────────────────────────

async function recordReport(userId: string, qrId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    const userSnap = await db.collection("users").doc(userId).get();
    const userData = userSnap.data() as any;

    const dailyWs = tsToMs(userData?.reportRateWindowStart);
    const dailyCount = userData?.reportRateCount || 0;
    const hourlyWs = tsToMs(userData?.reportHourlyWindowStart);
    const hourlyCount = userData?.reportHourlyCount || 0;

    const updates: Record<string, any> = {};

    if (isWithin24h(dailyWs)) {
      updates.reportRateCount = dailyCount + 1;
    } else {
      updates.reportRateWindowStart = admin.firestore.FieldValue.serverTimestamp();
      updates.reportRateCount = 1;
    }

    if (isWithinMs(hourlyWs, HOURLY_REPORT_WINDOW_MS)) {
      updates.reportHourlyCount = hourlyCount + 1;
    } else {
      updates.reportHourlyWindowStart = admin.firestore.FieldValue.serverTimestamp();
      updates.reportHourlyCount = 1;
    }

    await db.collection("users").doc(userId).update(updates);

    // Per-QR report log
    const perQrRef = db.collection("users").doc(userId).collection("reportLog").doc(qrId);
    const perQrSnap = await perQrRef.get();
    const perQr = perQrSnap.data() as any;
    const perQrWs = tsToMs(perQr?.windowStart);
    const perQrCount = perQr?.count || 0;

    if (isWithinMs(perQrWs, HOURLY_REPORT_WINDOW_MS)) {
      await perQrRef.update({ count: perQrCount + 1 });
    } else {
      await perQrRef.set({ windowStart: admin.firestore.FieldValue.serverTimestamp(), count: 1 });
    }
  } catch {}
}

// ─── Fire-and-forget collusion analysis ──────────────────────────────────────

function runCollusionCheck(qrId: string): void {
  const db = getAdminDb();
  if (!db) return;
  Promise.resolve().then(async () => {
    try {
      const reportsSnap = await db
        .collection("qrCodes").doc(qrId)
        .collection("reports")
        .limit(500)
        .get();

      const allNeg = reportsSnap.docs.filter((d) => {
        const data = d.data();
        return !data.userRemoved && data.reportType && data.reportType !== "safe";
      });

      let suspicious = false;
      let reason: string | null = null;
      let negativeWeightMultiplier = 1;

      if (allNeg.length >= 5) {
        const lowTierNeg = allNeg.filter((d) => (d.data().weight || 1) <= 0.3);
        if (lowTierNeg.length / allNeg.length > 0.7) {
          suspicious = true;
          reason = "Majority of reports are from new or low-credibility accounts.";
          negativeWeightMultiplier = 0.2;
        }
      }

      await db.collection("qrCodes").doc(qrId).update({
        suspiciousVoteFlag: suspicious,
        suspiciousFlagReason: reason,
        suspiciousNegMultiplier: negativeWeightMultiplier,
        suspiciousLastChecked: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {}
  }).catch(() => {});
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified = false,
): Promise<{ action: "created" | "updated" | "removed" }> {
  const db = getAdminDb();
  if (!db) throw new Error("Database not available");

  // Fetch QR owner and existing report in parallel
  const [qrSnap, existingReportSnap] = await Promise.all([
    db.collection("qrCodes").doc(qrId).get(),
    db.collection("qrCodes").doc(qrId).collection("reports").doc(userId).get(),
  ]);

  const qrOwnerId: string | undefined = (qrSnap.data() as any)?.ownerId;
  const existingData = existingReportSnap.data() as any;
  const existingReport: string | null =
    existingData && !existingData.userRemoved ? (existingData.reportType ?? null) : null;

  // Same type tapped again → toggle off (unreport)
  if (existingReport === reportType) {
    await db
      .collection("qrCodes").doc(qrId)
      .collection("reports").doc(userId)
      .update({
        userRemoved: true,
        removedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    runCollusionCheck(qrId);
    return { action: "removed" };
  }

  const isChangingReport = existingReport !== null;
  const { weight } = await checkReportEligibility(userId, qrId, emailVerified, qrOwnerId, isChangingReport);

  // Get account age for new reports
  let accountAgeDays = 0;
  if (!isChangingReport) {
    try {
      const userSnap = await db.collection("users").doc(userId).get();
      const userData = userSnap.data() as any;
      if (userData?.createdAt) {
        const createdMs = tsToMs(userData.createdAt);
        accountAgeDays = Math.floor((Date.now() - createdMs) / 86_400_000);
      }
    } catch {}
  }

  if (isChangingReport) {
    await db
      .collection("qrCodes").doc(qrId)
      .collection("reports").doc(userId)
      .update({
        reportType,
        weight,
        userRemoved: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  } else {
    await db
      .collection("qrCodes").doc(qrId)
      .collection("reports").doc(userId)
      .set({
        reportType,
        weight,
        reporterId: userId,
        accountAgeDays,
        emailVerified,
        userRemoved: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    await recordReport(userId, qrId);
  }

  runCollusionCheck(qrId);
  return { action: isChangingReport ? "updated" : "created" };
}
