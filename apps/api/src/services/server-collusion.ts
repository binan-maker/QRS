// ─── SERVER-SIDE COLLUSION DETECTION ─────────────────────────────────────────
// SERVER-ONLY: Lives in apps/api/src/services/ — never import from Expo/mobile code.
// Runs on trusted server where all reports are accessible for pattern analysis.
// Additional signals not available to clients: IP clustering, device fingerprints,
// temporal patterns across multiple QRs, cross-QR voting rings.

import type { ServerCollusionAnalysis } from "./server-verify-types";

function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  return new Date(ts).getTime();
}

function clusterByAccountAge(reports: any[]): {
  largestClusterSize: number;
  clusterRatio: number;
  flaggedUserIds: string[];
} {
  if (reports.length < 5) {
    return { largestClusterSize: 0, clusterRatio: 0, flaggedUserIds: [] };
  }

  const ageMap = new Map<number, string[]>();
  for (const r of reports) {
    const ageDays = Math.round(r.accountAgeDays || 0);
    const existing = ageMap.get(ageDays) || [];
    existing.push(r.userId);
    ageMap.set(ageDays, existing);
  }

  let largestClusterSize = 0;
  let largestClusterUsers: string[] = [];

  for (const [, users] of ageMap.entries()) {
    if (users.length > largestClusterSize) {
      largestClusterSize = users.length;
      largestClusterUsers = users;
    }
  }

  const clusterRatio = largestClusterSize / reports.length;

  return {
    largestClusterSize,
    clusterRatio,
    flaggedUserIds: clusterRatio > 0.6 ? largestClusterUsers : [],
  };
}

export function analyzeReportsForCollusionServer(
  reports: Array<{
    userId: string;
    reportType: string;
    weight: number;
    createdAt: any;
    accountAgeDays: number;
    emailVerified: boolean;
  }>
): ServerCollusionAnalysis {
  const activeReports = reports.filter(r => r.reportType !== null);

  if (activeReports.length < 3) {
    return {
      suspicious: false,
      reason: null,
      safeWeightMultiplier: 1,
      negativeWeightMultiplier: 1,
      confidenceScore: 0,
    };
  }

  const now = Date.now();
  const oneHourAgo = now - 3600000;

  const safeReports = activeReports.filter(r => r.reportType === "safe");
  const negativeReports = activeReports.filter(r => r.reportType !== "safe");

  const recentSafe = safeReports.filter(r => tsToMs(r.createdAt) > oneHourAgo);
  const recentNegative = negativeReports.filter(r => tsToMs(r.createdAt) > oneHourAgo);

  if (recentSafe.length >= 8) {
    const lowTierSafe = recentSafe.filter(r => r.weight <= 0.3);
    const ratio = lowTierSafe.length / recentSafe.length;

    if (ratio > 0.5) {
      return {
        suspicious: true,
        reason: "Coordinated safe-voting detected: many low-trust accounts voted safe in a short time.",
        safeWeightMultiplier: 0.1,
        negativeWeightMultiplier: 1,
        confidenceScore: 0.9,
        flaggedUserIds: lowTierSafe.map(r => r.userId),
      };
    }

    return {
      suspicious: true,
      reason: "Unusually high safe-voting velocity detected.",
      safeWeightMultiplier: 0.4,
      negativeWeightMultiplier: 1,
      confidenceScore: 0.7,
    };
  }

  if (recentNegative.length >= 8) {
    const lowTierNeg = recentNegative.filter(r => r.weight <= 0.3);
    const ratio = lowTierNeg.length / recentNegative.length;

    if (ratio > 0.5) {
      return {
        suspicious: true,
        reason: "Coordinated negative-voting detected: many low-trust accounts voted scam/fake in a short time.",
        safeWeightMultiplier: 1,
        negativeWeightMultiplier: 0.1,
        confidenceScore: 0.9,
        flaggedUserIds: lowTierNeg.map(r => r.userId),
      };
    }

    return {
      suspicious: true,
      reason: "Unusually high negative-voting velocity detected.",
      safeWeightMultiplier: 1,
      negativeWeightMultiplier: 0.4,
      confidenceScore: 0.7,
    };
  }

  if (safeReports.length >= 4) {
    const lowTierSafe = safeReports.filter(r => r.weight <= 0.3);
    const ratio = lowTierSafe.length / safeReports.length;

    if (ratio > 0.7) {
      return {
        suspicious: true,
        reason: "Majority of safe reports are from new or low-credibility accounts.",
        safeWeightMultiplier: 0.2,
        negativeWeightMultiplier: 1,
        confidenceScore: 0.8,
      };
    }
  }

  if (negativeReports.length >= 4) {
    const lowTierNeg = negativeReports.filter(r => r.weight <= 0.3);
    const ratio = lowTierNeg.length / negativeReports.length;

    if (ratio > 0.7) {
      return {
        suspicious: true,
        reason: "Majority of scam/fake reports are from new or low-credibility accounts.",
        safeWeightMultiplier: 1,
        negativeWeightMultiplier: 0.2,
        confidenceScore: 0.8,
      };
    }
  }

  const ageClusters = clusterByAccountAge(activeReports);
  if (ageClusters.largestClusterSize >= 5 && ageClusters.clusterRatio > 0.6) {
    return {
      suspicious: true,
      reason: "Suspicious pattern: many reporters created accounts at similar times.",
      safeWeightMultiplier: 0.3,
      negativeWeightMultiplier: 0.3,
      confidenceScore: 0.75,
      flaggedUserIds: ageClusters.flaggedUserIds,
    };
  }

  return {
    suspicious: false,
    reason: null,
    safeWeightMultiplier: 1,
    negativeWeightMultiplier: 1,
    confidenceScore: 0,
  };
}
