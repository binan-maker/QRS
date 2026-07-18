/**
 * BullMQ Analytics Worker (Phase 3.5)
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
import { getAdminDb } from "../src/lib/firebase-admin";
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
    // Increment the qr's scan counter in Firestore (atomic)
    const qrRef = db.collection("qrs").doc(qrId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(qrRef);
      if (!doc.exists) return;
      const current = (doc.data()?.scanCount ?? 0) as number;
      tx.update(qrRef, {
        scanCount:  current + 1,
        lastScannedAt: new Date(timestamp),
      });

      // Invalidate cached trust score at scan count thresholds
      if (shouldRefreshTrust(current + 1)) {
        await cache.invalidate(`trust:${qrId}`);
        console.log(`[analytics.worker] Trust cache invalidated for QR ${qrId} at ${current + 1} scans`);
      }
    });

    // Log scan record ID for audit trail
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
