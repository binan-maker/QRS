/**
 * BullMQ Maintenance Worker (Phase 3.5)
 *
 * Handles DB housekeeping on a daily cron — runs tasks that must not block
 * the request path:
 *   - Expire notifications older than 30 days
 *   - Archive qr_scans older than 90 days
 *   - Purge soft-deleted users after 30-day grace period
 *
 * To run:
 *   UPSTASH_REDIS_URL=rediss://... DATABASE_URL=postgres://... npx tsx apps/api/workers/maintenance.worker.ts
 */

import { Worker, Queue } from "bullmq";
import type { MaintenanceJobData } from "../src/infrastructure/queue";
import { QUEUE_NAMES } from "../src/infrastructure/queue";
import { getAdminDb } from "../src/lib/firebase-admin";

// ─── Redis connection ─────────────────────────────────────────────────────────

const redisUrl = process.env.UPSTASH_REDIS_URL ?? process.env.REDIS_URL;
if (!redisUrl) {
  console.error("[maintenance.worker] UPSTASH_REDIS_URL not set — exiting");
  process.exit(1);
}

const connection = new (require("ioredis"))(redisUrl, { maxRetriesPerRequest: null });

// ─── Task implementations ─────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function expireNotifications(): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const snap = await db
    .collectionGroup("notifications")
    .where("createdAt", "<", cutoff)
    .limit(500)
    .get();

  if (snap.empty) { console.log("[maintenance] No stale notifications"); return; }

  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`[maintenance] Deleted ${snap.size} notifications older than 30 days`);
}

async function archiveOldScans(): Promise<void> {
  // Phase 2 target: move scans to a cold-storage/archive table in PostgreSQL.
  // For now, log intent only — Firestore scans are append-only and not deleted.
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
  console.log(`[maintenance] archive_old_scans placeholder — cutoff: ${cutoff.toISOString()}`);
  // TODO(Phase 2): SELECT INTO qr_scans_archive FROM qr_scans WHERE scanned_at < cutoff
}

async function cleanupSoftDeletedUsers(): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const snap = await db
    .collection("users")
    .where("isDeleted", "==", true)
    .where("deletedAt", "<", cutoff)
    .limit(100)
    .get();

  if (snap.empty) { console.log("[maintenance] No users to purge"); return; }

  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`[maintenance] Hard-deleted ${snap.size} soft-deleted user records`);
}

// ─── Job handler ──────────────────────────────────────────────────────────────

async function processMaintenanceJob(job: { data: MaintenanceJobData }) {
  switch (job.data.task) {
    case "expire_notifications":       return expireNotifications();
    case "archive_old_scans":          return archiveOldScans();
    case "cleanup_soft_deleted_users": return cleanupSoftDeletedUsers();
    default:
      console.warn(`[maintenance.worker] Unknown task: ${(job.data as any).task}`);
  }
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker<MaintenanceJobData>(
  QUEUE_NAMES.MAINTENANCE,
  processMaintenanceJob,
  { connection, concurrency: 1 }, // maintenance tasks must not run in parallel
);

worker.on("completed", (job) => {
  console.log(`[maintenance.worker] Task "${job.data.task}" completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[maintenance.worker] Task "${job?.data.task}" failed:`, err.message);
});

// ─── Daily cron schedule ──────────────────────────────────────────────────────

const queue = new Queue<MaintenanceJobData>(QUEUE_NAMES.MAINTENANCE, { connection });

const DAILY_TASKS: MaintenanceJobData["task"][] = [
  "expire_notifications",
  "archive_old_scans",
  "cleanup_soft_deleted_users",
];

for (const task of DAILY_TASKS) {
  queue.add(task, { task }, {
    repeat:  { pattern: "30 2 * * *" },
    jobId:   `maintenance:${task}`,
  }).catch(console.error);
}

console.log("[maintenance.worker] Worker started — daily cron at 02:30 UTC");

process.on("SIGTERM", async () => {
  await worker.close();
  connection.disconnect();
  process.exit(0);
});
