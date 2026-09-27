/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: BACKGROUND RE-ENGAGEMENT SCHEDULER
 * ───────────────────────────────────────────────────────────────────────────────
 * Dispatches gentle re-engagement push notifications to dormant users.
 * Runs on a 30-minute interval with multi-tiered cooldown controls.
 * Backed by public.users in Supabase.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sendExpoPush, isValidExpoPushToken } from "./lib/expo-push";
import { getAdminClient } from "./lib/supabase-admin";

const THIRTY_MIN_MS = 30 * 60 * 1000;

// ── Re-engagement notification tiers ──────────────────────────────────────────
const TIERS = [
  {
    minInactiveMs: 1 * 24 * 60 * 60 * 1000,  // 1 day
    maxInactiveMs: 2 * 24 * 60 * 60 * 1000,
    cooldownMs:    1 * 24 * 60 * 60 * 1000,
    messages: [
      { title: "Stay safe out there 🛡️", body: "Quick scan before your next payment? BinRo's got you." },
      { title: "Scan before you pay 👀",  body: "Fraudulent QR codes are on the rise. BinRo checks in seconds." },
      { title: "BinRo misses you 🔐",     body: "Haven't scanned today? Stay one step ahead of scammers." },
    ],
  },
  {
    minInactiveMs: 3 * 24 * 60 * 60 * 1000,  // 3 days
    maxInactiveMs: 6 * 24 * 60 * 60 * 1000,
    cooldownMs:    2 * 24 * 60 * 60 * 1000,
    messages: [
      { title: "3 days without a scan 🤔",  body: "QR scams don't take days off. A quick check keeps you safe." },
      { title: "Your guard is down 🚨",      body: "It's been a few days. Come back and scan with confidence." },
      { title: "India's QR scams are rising", body: "Don't be a statistic — tap to verify your next QR with BinRo." },
    ],
  },
  {
    minInactiveMs: 7 * 24 * 60 * 60 * 1000,  // 1 week
    maxInactiveMs: 13 * 24 * 60 * 60 * 1000,
    cooldownMs:    5 * 24 * 60 * 60 * 1000,
    messages: [
      { title: "One week since your last scan", body: "BinRo is ready whenever you are. Stay protected. 🛡️" },
      { title: "Weekly reminder 📅",             body: "Quick scans save real money. Come back to BinRo today." },
      { title: "Your digital shield needs you",  body: "It's been a week. Run a quick scan to stay safe." },
    ],
  },
  {
    minInactiveMs: 14 * 24 * 60 * 60 * 1000, // 2 weeks+
    maxInactiveMs: Infinity,
    cooldownMs:    7 * 24 * 60 * 60 * 1000,
    messages: [
      { title: "We miss you! 💙",           body: "QR fraud is smarter than ever. BinRo keeps you one step ahead." },
      { title: "Long time no scan 👋",       body: "Come back to BinRo — your security partner is still here for you." },
      { title: "Stay protected in 2025 🔒", body: "Scams evolve daily. BinRo's threat database has been updated." },
    ],
  },
] as const;

function pickMessage(tier: (typeof TIERS)[number], userId: string) {
  const idx = userId.charCodeAt(0) % tier.messages.length;
  return tier.messages[idx];
}

async function runReengagement(): Promise<void> {
  try {
    const client = getAdminClient();
    if (!client) return;
    const now = Date.now();

    // Query active push tokens from public.users
    const { data: users, error } = await client
      .from("users")
      .select("id, push_token, updated_at")
      .not("push_token", "is", null)
      .limit(500);

    if (error || !users || users.length === 0) return;

    const pushBatch: { to: string; title: string; body: string }[] = [];
    const updates: Promise<any>[] = [];

    for (const user of users) {
      const token = user.push_token;
      if (!token || !isValidExpoPushToken(token)) continue;

      const lastActivityAt = user.updated_at ? new Date(user.updated_at).getTime() : 0;
      const inactiveMs = now - lastActivityAt;

      const tier = TIERS.find(
        (t) => inactiveMs >= t.minInactiveMs && inactiveMs < t.maxInactiveMs,
      );
      if (!tier) continue;

      const msg = pickMessage(tier, user.id);
      pushBatch.push({ to: token, title: msg.title, body: msg.body });

      updates.push(
        client
          .from("users")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", user.id),
      );
    }

    if (pushBatch.length > 0) {
      console.log(`[Scheduler] Dispatching ${pushBatch.length} re-engagement notifications`);
      await sendExpoPush(pushBatch);
    }

    await Promise.allSettled(updates);
  } catch (error) {
    console.error("[Scheduler] Re-engagement run failed:", error);
  }
}

/**
 * Initializes the background re-engagement task scheduler.
 */
export function startScheduler(): void {
  console.log("[Scheduler] Push re-engagement service initialized");
  setTimeout(() => {
    runReengagement();
    setInterval(runReengagement, THIRTY_MIN_MS);
  }, 5 * 60 * 1000);
}
