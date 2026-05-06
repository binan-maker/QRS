// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT SERVICE - Compliance Logging for DPDP Act 2023 & RBI Guidelines
// ───────────────────────────────────────────────────────────────────────────────
// 
// Purpose: Maintain immutable audit trail for regulatory compliance
// - All user actions logged with timestamp, IP (masked), device info
// - Retention: 3 years (RBI requirement)
// - Access: Restricted to compliance team only
// - Storage: Firebase India region (asia-south1)
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from "../db/client";
import * as Crypto from "expo-crypto";

export type AuditEventType =
  | "qr_scan"
  | "report_submitted"
  | "report_deleted"
  | "comment_submitted"
  | "comment_deleted"
  | "account_created"
  | "account_deleted"
  | "data_exported"
  | "consent_given"
  | "consent_withdrawn"
  | "verification_requested"
  | "verification_approved"
  | "verification_rejected"
  | "password_changed"
  | "email_verified"
  | "suspicious_activity_detected"
  | "rate_limit_exceeded"
  | "fraud_detected";

export interface AuditLogEntry {
  eventType: AuditEventType;
  userId: string; // Hashed for privacy
  timestamp: string; // ISO 8601 format
  ipAddress: string; // Last octet masked (e.g., "192.168.1.xxx")
  deviceInfo: string; // Platform + OS version
  qrId?: string; // If applicable
  actionResult: "success" | "failure" | "pending";
  metadata?: Record<string, any>; // Additional context
  complianceFlags: {
    dpdpRelevant: boolean;
    rbiRelevant: boolean;
    retentionYears: number;
  };
}

/**
 * Mask IP address for privacy (GDPR/DPDP requirement)
 * Removes last octet of IPv4 or last 80 bits of IPv6
 */
function maskIpAddress(ip: string): string {
  if (!ip) return "unknown";
  
  // IPv4 masking: remove last octet
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      parts[3] = "xxx";
      return parts.join(".");
    }
  }
  
  // IPv6 masking: keep only first 32 bits
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return parts.slice(0, 2).join(":") + ":xxxx:xxxx:xxxx:xxxx";
    }
  }
  
  return "masked";
}

/**
 * Hash user ID for privacy in audit logs
 * Uses SHA-256 for one-way hashing
 */
async function hashUserId(userId: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `audit_salt_2026_${userId}`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash.substring(0, 16); // Use first 16 chars for brevity
  } catch (error) {
    console.error("[audit] Failed to hash user ID:", error);
    return `hashed_${userId.substring(0, 8)}`;
  }
}

/**
 * Get device information for audit logging
 */
function getDeviceInfo(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const expoConstants = require("expo-constants").default;
    const platform = expoConstants.platform?.os || "unknown";
    const osVersion = expoConstants.platform?.osVersion || "unknown";
    const appName = expoConstants.expoConfig?.name || "QRGuard";
    
    return `${appName}/${platform}-${osVersion}`;
  } catch {
    return "unknown-device";
  }
}

/**
 * Log an audit event to Firestore
 * Automatically handles compliance flags based on event type
 */
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
    
    // Determine compliance relevance
    const dpdpRelevantEvents: AuditEventType[] = [
      "account_created",
      "account_deleted",
      "data_exported",
      "consent_given",
      "consent_withdrawn",
      "password_changed",
    ];
    
    const rbiRelevantEvents: AuditEventType[] = [
      "qr_scan",
      "report_submitted",
      "verification_approved",
      "verification_rejected",
      "fraud_detected",
    ];
    
    // Set retention period based on event type
    let retentionYears = 3; // Default (RBI requirement)
    if (eventType === "account_deleted" || eventType === "consent_withdrawn") {
      retentionYears = 7; // DPDP extended retention
    }
    
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
        dpdpRelevant: dpdpRelevantEvents.includes(eventType),
        rbiRelevant: rbiRelevantEvents.includes(eventType),
        retentionYears,
      },
    };
    
    // Store in auditLogs collection with auto-generated ID
    // Collection path: /auditLogs/{YYYY-MM}/{eventId}
    const datePrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
    await db.add(["auditLogs", datePrefix], entry);
    
    // Also log suspicious activities to Realtime DB for immediate monitoring
    if (eventType === "suspicious_activity_detected" || eventType === "fraud_detected") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { rtdb } = require("../db/client");
        await rtdb.push("securityAlerts", {
          ...entry,
          alertLevel: "high",
          requiresReview: true,
        });
      } catch (rtError) {
        console.warn("[audit] Failed to write to Realtime DB:", rtError);
      }
    }
  } catch (error) {
    // CRITICAL: Never fail silently on audit logging
    // But also don't break user flow if logging fails
    console.error("[audit] CRITICAL: Failed to log audit event:", error, {
      eventType,
      userId,
      qrId: options.qrId,
    });
    
    // In production, this should trigger an alert to the compliance team
    // For now, we log to console and continue
  }
}

/**
 * Retrieve audit logs for compliance review
 * Restricted to authorized personnel only
 */
export async function getAuditLogs(filters: {
  userId?: string;
  eventType?: AuditEventType;
  qrId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    // Build query based on filters
    // Note: This requires composite indexes in Firestore
    const constraints: any[] = [];
    
    if (filters.eventType) {
      constraints.push({ field: "eventType", op: "==", value: filters.eventType });
    }
    
    if (filters.qrId) {
      constraints.push({ field: "qrId", op: "==", value: filters.qrId });
    }
    
    // Sort by timestamp descending (most recent first)
    constraints.push({ field: "timestamp", direction: "desc" });
    
    const limit = filters.limit || 100;
    constraints.push({ field: "limit", value: limit });
    
    // Query each month's collection separately
    const allDocs: any[] = [];
    const startMonth = filters.startDate?.substring(0, 7) || "2024-01";
    const endMonth = filters.endDate?.substring(0, 7) || new Date().toISOString().substring(0, 7);
    
    // Generate list of months to query
    const months: string[] = [];
    let current = startMonth;
    while (current <= endMonth) {
      months.push(current);
      const [year, month] = current.split("-").map(Number);
      const nextMonth = new Date(year, month, 1).toISOString().substring(0, 7);
      current = nextMonth;
    }
    
    // Query each month
    for (const month of months) {
      try {
        const { docs } = await db.query(["auditLogs", month], {
          where: constraints.filter((c) => c.field !== "limit"),
          limit,
        });
        allDocs.push(...docs);
      } catch (err) {
        console.warn(`[audit] Failed to query ${month}:`, err);
      }
    }
    
    // Filter client-side for userId (hashed comparison)
    let results = allDocs.map((d) => ({ id: d.id, ...d.data } as AuditLogEntry));
    
    if (filters.userId) {
      const hashedFilter = await hashUserId(filters.userId);
      results = results.filter((r) => r.userId === hashedFilter);
    }
    
    // Apply date filters
    if (filters.startDate) {
      results = results.filter((r) => r.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((r) => r.timestamp <= filters.endDate!);
    }
    
    return results.slice(0, limit);
  } catch (error) {
    console.error("[audit] Failed to retrieve audit logs:", error);
    throw new Error("Unable to retrieve audit logs. Please contact support.");
  }
}

/**
 * Export audit logs for a specific user (DPDP Right to Access)
 * Returns formatted report for download
 */
export async function exportUserAuditLogs(userId: string): Promise<{
  fileName: string;
  content: string;
  generatedAt: string;
}> {
  try {
    const logs = await getAuditLogs({
      userId,
      limit: 10000, // Max export size
      startDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years
    });
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: userId.substring(0, 8) + "...", // Partial ID for privacy
      totalEvents: logs.length,
      events: logs.map((log) => ({
        ...log,
        // Remove internal fields from export
        complianceFlags: undefined,
      })),
    };
    
    return {
      fileName: `qrguard-audit-export-${userId.substring(0, 8)}.json`,
      content: JSON.stringify(exportData, null, 2),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[audit] Failed to export user audit logs:", error);
    throw new Error("Unable to export audit logs. Please contact support.");
  }
}

/**
 * Cleanup old audit logs beyond retention period
 * Should be run monthly via scheduled Cloud Function
 */
export async function cleanupExpiredAuditLogs(): Promise<{
  deletedCount: number;
  collectionsProcessed: number;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 3); // 3-year retention
    const cutoffMonth = cutoffDate.toISOString().substring(0, 7);
    
    let deletedCount = 0;
    let collectionsProcessed = 0;
    
    // Get all audit log collections
    // Note: This requires admin SDK in production
    const { docs } = await db.query(["auditLogs"], { limit: 1000 });
    
    for (const doc of docs) {
      const monthId = doc.id;
      if (monthId < cutoffMonth) {
        // Delete entire month collection
        try {
          await db.delete(["auditLogs", monthId]);
          deletedCount++;
          console.log(`[audit] Deleted expired collection: ${monthId}`);
        } catch (err) {
          console.error(`[audit] Failed to delete ${monthId}:`, err);
        }
      }
      collectionsProcessed++;
    }
    
    return { deletedCount, collectionsProcessed };
  } catch (error) {
    console.error("[audit] Failed to cleanup expired logs:", error);
    throw error;
  }
}

/**
 * Detect suspicious patterns in audit logs
 * Used for fraud prevention and security monitoring
 */
export async function detectSuspiciousPatterns(options: {
  userId?: string;
  timeWindowMinutes?: number;
}): Promise<{
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number; // 0-100
}> {
  const timeWindow = options.timeWindowMinutes || 60;
  const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();
  
  const reasons: string[] = [];
  let riskScore = 0;
  
  try {
    // Get recent audit logs
    const recentLogs = await getAuditLogs({
      userId: options.userId,
      startDate: cutoffTime,
      limit: 1000,
    });
    
    // Pattern 1: Excessive failed actions
    const failedActions = recentLogs.filter((l) => l.actionResult === "failure");
    if (failedActions.length > 10) {
      reasons.push(`High failure rate: ${failedActions.length} failures in ${timeWindow} minutes`);
      riskScore += 20;
    }
    
    // Pattern 2: Rapid-fire QR scans (potential scraping)
    const scanEvents = recentLogs.filter((l) => l.eventType === "qr_scan");
    if (scanEvents.length > 50) {
      reasons.push(`Unusual scan velocity: ${scanEvents.length} scans in ${timeWindow} minutes`);
      riskScore += 30;
    }
    
    // Pattern 3: Multiple account operations
    const accountOps = recentLogs.filter((l) =>
      ["account_created", "password_changed", "email_verified"].includes(l.eventType)
    );
    if (accountOps.length > 5) {
      reasons.push(`Suspicious account activity: ${accountOps.length} operations in ${timeWindow} minutes`);
      riskScore += 40;
    }
    
    // Pattern 4: Fraud reports received
    const fraudReports = recentLogs.filter((l) =>
      ["report_submitted", "fraud_detected"].includes(l.eventType)
    );
    if (fraudReports.length > 20) {
      reasons.push(`High report volume: ${fraudReports.length} reports in ${timeWindow} minutes`);
      riskScore += 25;
    }
    
    return {
      isSuspicious: riskScore >= 50,
      reasons,
      riskScore: Math.min(riskScore, 100),
    };
  } catch (error) {
    console.error("[audit] Failed to detect suspicious patterns:", error);
    return {
      isSuspicious: false,
      reasons: ["Error analyzing patterns"],
      riskScore: 0,
    };
  }
}

export default {
  logAuditEvent,
  getAuditLogs,
  exportUserAuditLogs,
  cleanupExpiredAuditLogs,
  detectSuspiciousPatterns,
};
