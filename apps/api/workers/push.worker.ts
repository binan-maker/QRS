/**
 * BullMQ Push Notification Worker
 *
 * Replaces the setInterval-based scheduler in server/scheduler.ts (Phase 3.5).
 * Runs as a separate process; deployed independently on Railway/Fly.io.
 *
 * Distributed lock via Redis SETNX ensures each (userId, tier) pair receives
 * at most one push per cooldown period, regardless of worker instance count.
 *
 * To run locally:
 *   UPSTASH_REDIS_URL=rediss://... npx tsx apps/api/workers/push.worker.ts
 */

import { Worker, Queue } from "bullmq";
import { createClient } from "ioredis";
import { getAdminDb } from "../src/lib/firebase-admin";
import { sendExpoPush, isValidExpoPushToken } from "../src/lib/expo-push";
import type { PushNotificationJobData } from "../src/infrastructure/queue";
import { QUEUE_NAMES } from "../src/infrastructure/queue";

// ─── Redis connection ─────────────────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL;
if (!redisUrl) {
  console.error("[push.worker] UPSTASH_REDIS_URL not set — exiting");
  process.exit(1);
}

const connection = new (require("ioredis"))(redisUrl, { maxRetriesPerRequest: null });

// ─── Re-engagement tiers ──────────────────────────────────────────────────────

const TIERS = [
  {
    id: "day-1",
    minMs: 1  * 86400_000, maxMs: 2  * 86400_000, cooldownMs: 1  * 86400_000,
    messages: [
      { title: "Stay safe out there 🛡️", body: "Quick scan before your next payment? BinRo's got you." },
      { title: "Scan before you pay 👀",  body: "Fraudulent QR codes are on the rise. BinRo checks in seconds." },
    ],
  },
  {
    id: "day-3",
    minMs: 3  * 86400_000, maxMs: 6  * 86400_000, cooldownMs: 2  * 86400_000,
    messages: [
      { title: "3 days without a scan 🤔", body: "QR scams don't take days off. A quick check keeps you safe." },
      { title: "Your guard is down 🚨",     body: "It's been a few days. Come back and scan with confidence." },
    ],
  },
  {
    id: "week-1",
    minMs: 7  * 86400_000, maxMs: 13 * 86400_000, cooldownMs: 5  * 86400_000,
    messages: [
      { title: "One week since your last scan", body: "BinRo is ready whenever you are. Stay protected. 🛡️" },
      { title: "Weekly reminder 📅",             body: "Quick scans save real money. Come back to BinRo today." },
    ],
  },
  {
    id: "week-2+",
    minMs: 14 * 86400_000, maxMs: Infinity, cooldownMs: 7  * 86400_000,
    messages: [
      { title: "We miss you! 💙",      body: "QR fraud is smarter than ever. BinRo keeps you one step ahead." },
      { title: "Long time no scan 👋", body: "Come back to BinRo — your security partner is still here for you." },
    ],
  },
] as const;

// ─── Lock helper ──────────────────────────────────────────────────────────────

async function acquireLock(key: string, ttlMs: number): Promise<boolean> {
  const result = await connection.set(key, "1", "PX", ttlMs, "NX");
  return result === "OK";
}

// ─── Job handler ──────────────────────────────────────────────────────────────

async function processJob(job: { data: PushNotificationJobData }) {
  const { userId, pushToken, title, body } = job.data;
  if (!isValidExpoPushToken(pushToken)) return;

  await sendExpoPush([{ to: pushToken, title, body }] as any);
}

// ─── Re-engagement scan (cron entry point) ────────────────────────────────────

async function runReengagementScan() {
  const db = getAdminDb();
  if (!db) { console.warn("[push.worker] Firebase Admin not configured"); return; }

  const now = Date.now();
  const usersSnap = await db
    .collection("users")
    .where("pushToken", "!=", null)
    .limit(500)
    .get();

  const queue = new Queue<PushNotificationJobData>(QUEUE_NAMES.PUSH_NOTIFICATIONS, { connection });

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const pushToken: string = data.pushToken;
    const lastActive: number = data.lastActiveAt?.toMillis?.() ?? 0;
    if (!pushToken || !isValidExpoPushToken(pushToken)) continue;

    const inactiveMs = now - lastActive;

    for (const tier of TIERS) {
      if (inactiveMs < tier.minMs || inactiveMs >= tier.maxMs) continue;

      const lockKey = `push_lock:${doc.id}:${tier.id}`;
      const locked = await acquireLock(lockKey, tier.cooldownMs);
      if (!locked) break; // already sent this tier recently

      const msg = tier.messages[Math.floor(Math.random() * tier.messages.length)]!;
      await queue.add("send-push", {
        userId: doc.id,
        pushToken,
        title:  msg.title,
        body:   msg.body,
      });
      break; // only one tier per scan
    }
  }
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker<PushNotificationJobData>(
  QUEUE_NAMES.PUSH_NOTIFICATIONS,
  processJob,
  {
    connection,
    concurrency: 20,
  },
);

worker.on("completed", (job) => {
  console.log(`[push.worker] Job ${job.id} completed (user: ${job.data.userId})`);
});

worker.on("failed", (job, err) => {
  console.error(`[push.worker] Job ${job?.id} failed:`, err.message);
});

// ─── Cron: enqueue re-engagement scan every 30 minutes ───────────────────────

const cronQueue = new Queue("push-cron", { connection });
cronQueue.add(
  "re-engagement-scan",
  {},
  { repeat: { pattern: "*/30 * * * *" }, jobId: "re-engagement-cron" },
).catch(console.error);

const cronWorker = new Worker("push-cron", async () => {
  console.log("[push.worker] Running re-engagement scan...");
  await runReengagementScan();
}, { connection, concurrency: 1 });

cronWorker.on("failed", (_, err) => console.error("[push-cron] failed:", err.message));

console.log("[push.worker] Worker started — listening for jobs");

// Graceful shutdown
process.on("SIGTERM", async () => {
  await worker.close();
  await cronWorker.close();
  connection.disconnect();
  process.exit(0);
});
