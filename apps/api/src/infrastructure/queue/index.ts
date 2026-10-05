/**
 * @infrastructure/queue — BullMQ Queue instances + job type definitions
 *
 * Phase 3.5: replaces the setInterval-based scheduler in scheduler.ts.
 * Workers run as separate processes (apps/api/workers/*.worker.ts).
 *
 * Redis connection:
 *   Requires UPSTASH_REDIS_URL (native Redis / ioredis format, rediss://)
 *   or REDIS_URL.  Falls back gracefully when neither is set (dev without Redis).
 */

import { Queue, type ConnectionOptions } from "bullmq";

// ─── Job Payload Types ────────────────────────────────────────────────────────

export interface PushNotificationJobData {
  userId: string;
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface AnalyticsJobData {
  qrId: string;
  scanId: string;
  event: "scan" | "qr_view";
  timestamp: string; // ISO
}

export interface MaintenanceJobData {
  task: "expire_notifications" | "archive_old_scans" | "cleanup_soft_deleted_users";
}

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  PUSH_NOTIFICATIONS: "push-notifications",
  ANALYTICS:          "analytics",
  MAINTENANCE:        "maintenance",
} as const;

// ─── Redis connection helper ──────────────────────────────────────────────────

function getRedisConnection(): ConnectionOptions | null {
  const url =
    process.env.UPSTASH_REDIS_URL ??   // rediss://:<token>@<host>:<port>
    process.env.REDIS_URL ??
    null;

  if (!url) return null;

  // BullMQ accepts a connection string directly via `url` key
  return { url };
}

// ─── Queue singletons (created lazily) ───────────────────────────────────────

let _pushQueue:        Queue<PushNotificationJobData> | null = null;
let _analyticsQueue:   Queue<AnalyticsJobData>        | null = null;
let _maintenanceQueue: Queue<MaintenanceJobData>       | null = null;
let _warned = false;

function warnNoRedis() {
  if (!_warned) {
    console.warn("[Queue] UPSTASH_REDIS_URL / REDIS_URL not set — BullMQ queues disabled. Falling back to in-process scheduler.");
    _warned = true;
  }
}

export function getPushQueue(): Queue<PushNotificationJobData> | null {
  const conn = getRedisConnection();
  if (!conn) { warnNoRedis(); return null; }
  if (!_pushQueue) {
    _pushQueue = new Queue<PushNotificationJobData>(QUEUE_NAMES.PUSH_NOTIFICATIONS, {
      connection: conn,
      defaultJobOptions: {
        attempts:       3,
        backoff:        { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail:   { count: 200 },
      },
    });
  }
  return _pushQueue;
}

export function getAnalyticsQueue(): Queue<AnalyticsJobData> | null {
  const conn = getRedisConnection();
  if (!conn) { warnNoRedis(); return null; }
  if (!_analyticsQueue) {
    _analyticsQueue = new Queue<AnalyticsJobData>(QUEUE_NAMES.ANALYTICS, {
      connection: conn,
      defaultJobOptions: {
        attempts:       2,
        removeOnComplete: { count: 500 },
        removeOnFail:   { count: 100 },
      },
    });
  }
  return _analyticsQueue;
}

export function getMaintenanceQueue(): Queue<MaintenanceJobData> | null {
  const conn = getRedisConnection();
  if (!conn) { warnNoRedis(); return null; }
  if (!_maintenanceQueue) {
    _maintenanceQueue = new Queue<MaintenanceJobData>(QUEUE_NAMES.MAINTENANCE, {
      connection: conn,
      defaultJobOptions: {
        attempts:       2,
        removeOnComplete: { count: 50 },
        removeOnFail:   { count: 50 },
      },
    });
  }
  return _maintenanceQueue;
}

// ─── Enqueue helpers ──────────────────────────────────────────────────────────

/** Fire-and-forget: enqueue a push notification job. No-op if Redis unavailable. */
export async function enqueuePush(data: PushNotificationJobData): Promise<void> {
  const q = getPushQueue();
  if (!q) return;
  await q.add("send-push", data).catch((e) => console.error("[Queue] enqueuePush failed:", e));
}

/** Fire-and-forget: enqueue a scan analytics job. No-op if Redis unavailable. */
export async function enqueueAnalytics(data: AnalyticsJobData): Promise<void> {
  const q = getAnalyticsQueue();
  if (!q) return;
  await q.add("process-analytics", data).catch((e) => console.error("[Queue] enqueueAnalytics failed:", e));
}

/** Schedule maintenance tasks as BullMQ repeatable cron jobs. Call once at startup. */
export async function scheduleMaintenance(): Promise<void> {
  const q = getMaintenanceQueue();
  if (!q) return;

  // Daily housekeeping tasks (at 2:30 AM UTC)
  const tasks: MaintenanceJobData["task"][] = [
    "expire_notifications",
    "archive_old_scans",
    "cleanup_soft_deleted_users",
  ];

  for (const task of tasks) {
    await q.add(
      task,
      { task },
      { repeat: { pattern: "30 2 * * *" }, jobId: `maintenance:${task}` },
    ).catch((e) => console.error(`[Queue] scheduleMaintenance ${task} failed:`, e));
  }

  console.log("[Queue] Maintenance cron jobs scheduled");
}
