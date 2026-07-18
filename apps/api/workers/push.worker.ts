/**
 * BullMQ Push Notification Worker
 *
 * Replaces the setInterval-based scheduler in server/scheduler.ts (SCALE-3 fix).
 *
 * Phase 3: runs as a separate process deployed independently on Railway/Fly.io.
 * Uses a Redis distributed lock (SETNX) to guarantee one push per user per tier,
 * regardless of worker instance count.
 *
 * Cron: every 30 minutes via BullMQ repeatable jobs.
 *
 * To run locally:
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... npx tsx apps/api/workers/push.worker.ts
 */

// TODO (Phase 3): implement using BullMQ Worker + Expo Push API
//
// import { Worker, Queue } from "bullmq";
// import type { PushNotificationJobData } from "../src/infrastructure/queue";
// import { QUEUE_NAMES } from "../src/infrastructure/queue";
//
// const worker = new Worker<PushNotificationJobData>(
//   QUEUE_NAMES.PUSH_NOTIFICATIONS,
//   async (job) => {
//     const { userId, pushToken, title, body, data } = job.data;
//     // Acquire distributed lock: SETNX push_lock:{userId}:{tier} 1 EX 1800
//     // If lock not acquired → skip (another worker already sent)
//     // Send via ExpoPushProvider
//     // Release lock
//   },
//   { connection: redisConnection },
// );
//
// worker.on("failed", (job, err) => {
//   console.error(`Push job ${job?.id} failed:`, err);
// });

console.log("[push.worker] Phase 3 placeholder — not yet implemented");
