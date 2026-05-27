import { getAuditLogs } from "./reader";

export async function detectSuspiciousPatterns(options: {
  userId?: string;
  timeWindowMinutes?: number;
}): Promise<{
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number;
}> {
  const timeWindow = options.timeWindowMinutes || 60;
  const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000).toISOString();
  const reasons: string[] = [];
  let riskScore = 0;

  try {
    const recentLogs = await getAuditLogs({ userId: options.userId, startDate: cutoffTime, limit: 1000 });

    const failedActions = recentLogs.filter((l) => l.actionResult === "failure");
    if (failedActions.length > 10) {
      reasons.push(`High failure rate: ${failedActions.length} failures in ${timeWindow} minutes`);
      riskScore += 20;
    }

    const scanEvents = recentLogs.filter((l) => l.eventType === "qr_scan");
    if (scanEvents.length > 50) {
      reasons.push(`Unusual scan velocity: ${scanEvents.length} scans in ${timeWindow} minutes`);
      riskScore += 30;
    }

    const accountOps = recentLogs.filter((l) =>
      ["account_created", "password_changed", "email_verified"].includes(l.eventType)
    );
    if (accountOps.length > 5) {
      reasons.push(`Suspicious account activity: ${accountOps.length} operations in ${timeWindow} minutes`);
      riskScore += 40;
    }

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
    return { isSuspicious: false, reasons: ["Error analyzing patterns"], riskScore: 0 };
  }
}
