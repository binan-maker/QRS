/**
 * @infrastructure/queue — BullMQ job definitions
 *
 * Replaces the setInterval-based scheduler in server/scheduler.ts.
 * Phase 3: each queue is backed by Upstash Redis.
 *
 * Queues:
 *   PushNotificationQueue  — re-engagement push jobs (every 30 min)
 *   AnalyticsQueue         — async scan analytics processing
 *   MaintenanceQueue       — DB housekeeping (expire sessions, archive old scans)
 */

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

// Placeholder — BullMQ Queue instances created in Phase 3 workers.
export {};
