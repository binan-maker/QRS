import { db } from "@/lib/db/client";
import type { AuditEventType, AuditLogEntry } from "./types";
import { maskIpAddress, hashUserId, getDeviceInfo } from "./privacy";

const DPDP_EVENTS: AuditEventType[] = [
  "account_created", "account_deleted", "data_exported",
  "consent_given", "consent_withdrawn", "password_changed",
];

const RBI_EVENTS: AuditEventType[] = [
  "qr_scan", "report_submitted", "verification_approved",
  "verification_rejected", "fraud_detected",
];

export async function logAuditEvent(
  eventType: AuditEventType,
  userId: string | null,
  options: {
    ipAddress?: string;
    qrId?: string;
    actionResult?: "success" | "failure" | "pending";
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    const hashedUserId = userId ? await hashUserId(userId) : "anonymous";
    const maskedIp = maskIpAddress(options.ipAddress || "unknown");
    const deviceInfo = getDeviceInfo();

    let retentionYears = 3;
    if (eventType === "account_deleted" || eventType === "consent_withdrawn") retentionYears = 7;

    const entry: AuditLogEntry = {
      eventType,
      userId: hashedUserId,
      timestamp: new Date().toISOString(),
      ipAddress: maskedIp,
      deviceInfo,
      qrId: options.qrId,
      actionResult: options.actionResult || "success",
      metadata: options.metadata,
      complianceFlags: {
        dpdpRelevant: DPDP_EVENTS.includes(eventType),
        rbiRelevant: RBI_EVENTS.includes(eventType),
        retentionYears,
      },
    };

    const datePrefix = new Date().toISOString().substring(0, 7);
    await db.add(["auditLogs", datePrefix], entry);

    if (eventType === "suspicious_activity_detected" || eventType === "fraud_detected") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { rtdb } = require("../../db/client");
        await rtdb.push("securityAlerts", { ...entry, alertLevel: "high", requiresReview: true });
      } catch (rtError) {
        console.warn("[audit] Failed to write to Realtime DB:", rtError);
      }
    }
  } catch (error) {
    console.error("[audit] CRITICAL: Failed to log audit event:", error, {
      eventType, userId, qrId: options.qrId,
    });
  }
}
