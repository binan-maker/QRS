import { db } from "@/lib/db/client";
import type { AuditEventType, AuditLogEntry } from "./types";
import { hashUserId } from "./privacy";
import { logger } from "@/shared/utils/logger";

export async function getAuditLogs(filters: {
  userId?: string;
  eventType?: AuditEventType;
  qrId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  try {
    const constraints: any[] = [];
    if (filters.eventType) constraints.push({ field: "eventType", op: "==", value: filters.eventType });
    if (filters.qrId) constraints.push({ field: "qrId", op: "==", value: filters.qrId });
    constraints.push({ field: "timestamp", direction: "desc" });
    const limit = filters.limit || 100;
    constraints.push({ field: "limit", value: limit });

    const allDocs: any[] = [];
    const startMonth = filters.startDate?.substring(0, 7) || "2024-01";
    const endMonth = filters.endDate?.substring(0, 7) || new Date().toISOString().substring(0, 7);

    const months: string[] = [];
    let current = startMonth;
    while (current <= endMonth) {
      months.push(current);
      const [year, month] = current.split("-").map(Number);
      current = new Date(year, month, 1).toISOString().substring(0, 7);
    }

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

    let results = allDocs.map((d) => ({ id: d.id, ...d.data } as AuditLogEntry));

    if (filters.userId) {
      const hashedFilter = await hashUserId(filters.userId);
      results = results.filter((r) => r.userId === hashedFilter);
    }
    if (filters.startDate) results = results.filter((r) => r.timestamp >= filters.startDate!);
    if (filters.endDate) results = results.filter((r) => r.timestamp <= filters.endDate!);

    return results.slice(0, limit);
  } catch (error) {
    console.error("[audit] Failed to retrieve audit logs:", error);
    throw new Error("Unable to retrieve audit logs. Please contact support.");
  }
}

export async function exportUserAuditLogs(userId: string): Promise<{
  fileName: string;
  content: string;
  generatedAt: string;
}> {
  try {
    const logs = await getAuditLogs({
      userId,
      limit: 10000,
      startDate: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: userId.substring(0, 8) + "...",
      totalEvents: logs.length,
      events: logs.map((log) => ({ ...log, complianceFlags: undefined })),
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

export async function cleanupExpiredAuditLogs(): Promise<{
  deletedCount: number;
  collectionsProcessed: number;
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
    const cutoffMonth = cutoffDate.toISOString().substring(0, 7);
    let deletedCount = 0;
    let collectionsProcessed = 0;
    const { docs } = await db.query(["auditLogs"], { limit: 1000 });
    for (const doc of docs) {
      const monthId = doc.id;
      if (monthId < cutoffMonth) {
        try {
          await db.delete(["auditLogs", monthId]);
          deletedCount++;
          logger.log(`[audit] Deleted expired collection: ${monthId}`);
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
