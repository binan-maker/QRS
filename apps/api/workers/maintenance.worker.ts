/**
 * BullMQ Maintenance Worker
 *
 * Handles DB housekeeping tasks that should not run in the request path:
 *   - Expire notifications older than 30 days
 *   - Archive qr_scans older than 90 days into a cold-storage table
 *   - Purge soft-deleted users after 30-day grace period
 *
 * Phase 3: runs on a daily cron via BullMQ repeatable jobs.
 *
 * To run:
 *   npx tsx apps/api/workers/maintenance.worker.ts
 */

// TODO (Phase 3): implement using BullMQ Worker
//
// import { Worker } from "bullmq";
// import type { MaintenanceJobData } from "../src/infrastructure/queue";
// import { QUEUE_NAMES } from "../src/infrastructure/queue";
//
// const worker = new Worker<MaintenanceJobData>(
//   QUEUE_NAMES.MAINTENANCE,
//   async (job) => {
//     switch (job.data.task) {
//       case "expire_notifications":   await expireOldNotifications(); break;
//       case "archive_old_scans":      await archiveOldScans(); break;
//       case "cleanup_soft_deleted_users": await cleanupSoftDeletedUsers(); break;
//     }
//   },
//   { connection: redisConnection },
// );

console.log("[maintenance.worker] Phase 3 placeholder — not yet implemented");
