/**
 * Re-engagement push notification scheduler.
 *
 * Runs every 30 minutes. Finds users who have a push token but haven't
 * opened the app for a while, and sends them a gentle re-engagement push.
 *
 * Per-user cooldown prevents spamming: a user only receives one
 * re-engagement push per tier per period.
 */

import { sendExpoPush, isValidExpoPushToken } from "./lib/expo-push";

const THIRTY_MIN_MS = 30 * 60 * 1000;

// ── Re-engagement tiers ───────────────────────────────────────────────────────
// Each tier fires once when the user enters that inactive window, then waits
// until they fall into the next tier before firing again.
const TIERS = [
  {
    minInactiveMs: 1  * 24 * 60 * 60 * 1000,  // 1 day
    maxInactiveMs: 2  * 24 * 60 * 60 * 1000,
    cooldownMs:    1  * 24 * 60 * 60 * 1000,
    messages: [
      { title: "Stay safe out there 🛡️", body: "Quick scan before your next payment? BinRo's got you." },
      { title: "Scan before you pay 👀",  body: "Fraudulent QR codes are on the rise. BinRo checks in seconds." },
      { title: "BinRo misses you 🔐",     body: "Haven't scanned today? Stay one step ahead of scammers." },
    ],
  },
  {
    minInactiveMs: 3  * 24 * 60 * 60 * 1000,  // 3 days
    maxInactiveMs: 6  * 24 * 60 * 60 * 1000,
    cooldownMs:    2  * 24 * 60 * 60 * 1000,
    messages: [
      { title: "3 days without a scan 🤔",  body: "QR scams don't take days off. A quick check keeps you safe." },
      { title: "Your guard is down 🚨",      body: "It's been a few days. Come back and scan with confidence." },
      { title: "India's QR scams are rising", body: "Don't be a statistic — tap to verify your next QR with BinRo." },
    ],
  },
  {
    minInactiveMs: 7  * 24 * 60 * 60 * 1000,  // 1 week
    maxInactiveMs: 13 * 24 * 60 * 60 * 1000,
    cooldownMs:    5  * 24 * 60 * 60 * 1000,
    messages: [
      { title: "One week since your last scan", body: "BinRo is ready whenever you are. Stay protected. 🛡️" },
      { title: "Weekly reminder 📅",             body: "Quick scans save real money. Come back to BinRo today." },
      { title: "Your digital shield needs you",  body: "It's been a week. Run a quick scan to stay safe." },
    ],
  },
  {
    minInactiveMs: 14 * 24 * 60 * 60 * 1000,  // 2 weeks+
    maxInactiveMs: Infinity,
    cooldownMs:    7  * 24 * 60 * 60 * 1000,
    messages: [
      { title: "We miss you! 💙",           body: "QR fraud is smarter than ever. BinRo keeps you one step ahead." },
      { title: "Long time no scan 👋",       body: "Come back to BinRo — your security partner is still here for you." },
      { title: "Stay protected in 2025 🔒", body: "Scams evolve daily. BinRo's threat database has been updated." },
    ],
  },
] as const;

function pickMessage(tier: (typeof TIERS)[number], userId: string) {
  // Deterministically pick a message variant based on userId so users don't
  // always see the same message.
  const idx = userId.charCodeAt(0) % tier.messages.length;
  return tier.messages[idx];
}

async function runReengagement(): Promise<void> {
  try {
    const { getAdminDb } = await import("./lib/firebase-admin");
    const adminDb = getAdminDb();
    if (!adminDb) return;
    const now = Date.now();

    // Fetch all users who have a push token
    // We limit to 500 per run to avoid long-running queries
    const snap = await adminDb
      .collection("users")
      .where("pushToken", "!=", null)
      .limit(500)
      .get();

    if (snap.empty) return;

    const pushBatch: { to: string; title: string; body: string }[] = [];
    const writes: Promise<any>[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const token: string | undefined = data.pushToken;
      if (!token || !isValidExpoPushToken(token)) continue;

      const lastOpenedAt: number = data.lastOpenedAt ?? 0;
      const inactiveMs = now - lastOpenedAt;

      // Find which tier the user falls in
      const tier = TIERS.find(
        (t) => inactiveMs >= t.minInactiveMs && inactiveMs < t.maxInactiveMs
      );
      if (!tier) continue;

      // Check cooldown — only one re-engagement push per tier window per cooldown period
      const lastReengagedAt: number = data.lastReengagementSentAt ?? 0;
      if (now - lastReengagedAt < tier.cooldownMs) continue;

      const msg = pickMessage(tier, doc.id);
      pushBatch.push({ to: token, title: msg.title, body: msg.body });

      // Record that we sent a re-engagement push
      writes.push(
        doc.ref.update({ lastReengagementSentAt: now }).catch(() => {})
      );
    }

    if (pushBatch.length > 0) {
      console.log(`[Scheduler] Sending ${pushBatch.length} re-engagement push(es)`);
      await sendExpoPush(pushBatch);
    }

    await Promise.allSettled(writes);
  } catch (e) {
    console.error("[Scheduler] Re-engagement run failed:", e);
  }
}

export function startScheduler(): void {
  console.log("[Scheduler] Re-engagement scheduler started (every 30 min)");
  // Run once shortly after startup, then every 30 minutes
  setTimeout(() => {
    runReengagement();
    setInterval(runReengagement, THIRTY_MIN_MS);
  }, 5 * 60 * 1000); // 5-min delay on startup so server stabilises first
}
