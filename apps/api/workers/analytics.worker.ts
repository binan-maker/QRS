/**
 * BullMQ Analytics Worker
 *
 * Processes scan analytics asynchronously — scan recording stays fast
 * (fire-and-forget) and this worker handles the aggregations.
 *
 * To run:
 *   UPSTASH_REDIS_URL=rediss://... npx tsx apps/api/workers/analytics.worker.ts
 */

import { Worker } from "bullmq";
import type { AnalyticsJobData } from "../src/infrastructure/queue";
import { QUEUE_NAMES } from "../src/infrastructure/queue";
import { admin, getAdminDb } from "../src/lib/firebase-admin";
import { getCacheService } from "../src/infrastructure/cache";

// ─── Redis connection ─────────────────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL;
if (!redisUrl) {
  console.error("[analytics.worker] UPSTASH_REDIS_URL not set — exiting");
  process.exit(1);
}

const connection = new (require("ioredis"))(redisUrl, { maxRetriesPerRequest: null });
const cache = getCacheService();

// ─── Scan count thresholds that trigger trust score refresh ──────────────────

const TRUST_REFRESH_THRESHOLDS = [10, 25, 50, 100, 250, 500, 1000];

function shouldRefreshTrust(scanCount: number): boolean {
  return TRUST_REFRESH_THRESHOLDS.some((t) => scanCount === t);
}

// ─── Job handler ──────────────────────────────────────────────────────────────

async function processAnalyticsJob(job: { data: AnalyticsJobData }) {
  const { qrId, scanId, event, timestamp } = job.data;
  const db = getAdminDb();

  if (!db) {
    console.warn("[analytics.worker] Firebase Admin not configured — skipping analytics");
    return;
  }

  if (event === "scan") {
    // Fetch the current scan count
    const qrRef = db.collection("qrs").doc(qrId);
    const qrSnapshot = await qrRef.get();
    if (!qrSnapshot.exists) {
      console.warn(`[analytics.worker] QR ${qrId} not found — skipping`);
      return;
    }

    const newCount = ((qrSnapshot.data()?.scanCount as number) ?? 0) + 1;
    await qrRef.update({
      scanCount: admin.firestore.FieldValue.increment(1),
      lastScannedAt: new Date(timestamp),
    });

    // Invalidate cached trust score at scan count thresholds
    if (shouldRefreshTrust(newCount)) {
      await cache.invalidate(`trust:${qrId}`);
      console.log(`[analytics.worker] Trust cache invalidated for QR ${qrId} at ${newCount} scans`);
    }

    console.log(`[analytics.worker] Scan ${scanId} processed for QR ${qrId}`);
  }
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker<AnalyticsJobData>(
  QUEUE_NAMES.ANALYTICS,
  processAnalyticsJob,
  {
    connection,
    concurrency: 10,
  },
);

worker.on("completed", (job) => {
  console.log(`[analytics.worker] Job ${job.id} done (${job.data.event} on ${job.data.qrId})`);
});

worker.on("failed", (job, err) => {
  console.error(`[analytics.worker] Job ${job?.id} failed:`, err.message);
});

console.log("[analytics.worker] Worker started");

process.on("SIGTERM", async () => {
  await worker.close();
  connection.disconnect();
  process.exit(0);
});
