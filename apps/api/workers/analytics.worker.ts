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
import { getAdminSupabase } from "../src/lib/supabase-admin";
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
  const supabase = getAdminSupabase();

  if (!supabase) {
    console.warn("[analytics.worker] Supabase Admin not configured — skipping analytics");
    return;
  }

  if (event === "scan") {
    // Fetch the current scan count
    const { data: qr, error: fetchErr } = await supabase
      .from("unified_qrs")
      .select("id, scan_count")
      .eq("id", qrId)
      .maybeSingle();

    if (fetchErr) {
      console.error(`[analytics.worker] Failed to fetch QR ${qrId}:`, fetchErr.message);
      return;
    }
    if (!qr) {
      console.warn(`[analytics.worker] QR ${qrId} not found — skipping`);
      return;
    }

    const newCount = ((qr.scan_count as number) ?? 0) + 1;

    // Atomic increment via RPC (falls back to read-then-write if RPC not available)
    const { error: rpcErr } = await supabase.rpc("increment_field", {
      p_table: "unified_qrs",
      p_id: qrId,
      p_field: "scan_count",
      p_delta: 1,
    });

    if (rpcErr) {
      // Fallback: direct update
      await supabase
        .from("unified_qrs")
        .update({ scan_count: newCount, last_scanned_at: new Date(timestamp).toISOString() })
        .eq("id", qrId);
    } else {
      // Update last_scanned_at separately
      await supabase
        .from("unified_qrs")
        .update({ last_scanned_at: new Date(timestamp).toISOString() })
        .eq("id", qrId);
    }

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
