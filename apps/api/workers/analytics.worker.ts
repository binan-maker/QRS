/**
 * BullMQ Analytics Worker
 *
 * Processes scan analytics asynchronously, keeping the scan recording
 * HTTP path fast (fire-and-forget pattern).
 *
 * Phase 3: aggregate scan counts, update time-series data, feed dashboards.
 *
 * To run:
 *   npx tsx apps/api/workers/analytics.worker.ts
 */

// TODO (Phase 3): implement using BullMQ Worker
//
// import { Worker } from "bullmq";
// import type { AnalyticsJobData } from "../src/infrastructure/queue";
// import { QUEUE_NAMES } from "../src/infrastructure/queue";
//
// const worker = new Worker<AnalyticsJobData>(
//   QUEUE_NAMES.ANALYTICS,
//   async (job) => {
//     const { qrId, scanId, event, timestamp } = job.data;
//     // Update qr_analytics time-series table
//     // Refresh cached trust score if scan count crossed a tier threshold
//   },
//   { connection: redisConnection },
// );

console.log("[analytics.worker] Phase 3 placeholder — not yet implemented");
