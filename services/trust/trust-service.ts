export interface TrustFactor {
  name: string;
  weight: number;
  score: number;
  description?: string;
}

export interface TrustScore {
  score: number;
  level?: "low" | "medium" | "high" | "verified";
  label: string;
  factors?: TrustFactor[];
  lastUpdated?: string;
  isVerified?: boolean;
  verificationMethod?: string;
  manipulationWarning?: boolean;
  totalReports: number;
}

/**
 * Calculates QR Trust Score solely from community feedback (safe, scam, spam votes)
 * and verified scan volume. Completely decoupled from URL heuristics or external domain checks.
 */
export function calculateTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>,
  collusionFlags?: {
    suspicious: boolean;
    safeWeightMultiplier?: number;
    negativeWeightMultiplier?: number;
  },
  scanCount: number = 0
): TrustScore {
  const rawSafe  = reportCounts.safe  || 0;
  const rawScam  = reportCounts.scam  || 0;
  const rawSpam  = reportCounts.spam  || 0;
  const rawFake  = reportCounts.fake  || 0;
  const rawTotal = rawSafe + rawScam + rawSpam + rawFake;
  const totalScans = Math.max(0, scanCount || reportCounts.scanCount || reportCounts.scan_count || 0);

  if (rawTotal === 0) {
    if (totalScans > 0) {
      const scanBoost = Math.min(Math.round(Math.log10(totalScans + 1) * 12), 20);
      const score = 50 + scanBoost;
      return { score, label: score >= 55 ? "Likely Safe" : "Uncertain", totalReports: 0 };
    }
    return { score: -1, label: "Unrated", totalReports: 0 };
  }

  const useWeighted = Boolean(weightedCounts && Object.keys(weightedCounts).length > 0);
  const resolveWeight = (raw: number, weighted?: number): number => {
    if (raw <= 0) return 0;
    return useWeighted && weighted && weighted > 0 ? weighted : raw;
  };

  let wSafe = resolveWeight(rawSafe, weightedCounts?.safe);
  let wScam = resolveWeight(rawScam, weightedCounts?.scam) * 1.5;
  let wSpam = resolveWeight(rawSpam, weightedCounts?.spam) + resolveWeight(rawFake, weightedCounts?.fake);

  if (collusionFlags?.suspicious) {
    wSafe *= (collusionFlags.safeWeightMultiplier ?? 1);
    wScam *= (collusionFlags.negativeWeightMultiplier ?? 1);
    wSpam *= (collusionFlags.negativeWeightMultiplier ?? 1);
  }

  const wTotal = wSafe + wScam + wSpam;
  if (wTotal === 0) return { score: -1, label: "Unrated", totalReports: rawTotal };

  const safeRatio = wSafe / wTotal;
  const reportConfidence = Math.min(rawTotal / 15, 1);
  const scanConfidence   = Math.min(totalScans / 50, 0.5);
  const confidence = Math.min(Math.max(reportConfidence, scanConfidence), 1);

  let score = 50 + (safeRatio * 100 - 50) * Math.max(0.25, confidence);

  // Scan count bonus when predominantly safe and zero verified scam reports
  if (rawScam === 0 && safeRatio >= 0.7 && totalScans > 5) {
    score += Math.min(Math.round(Math.log10(totalScans) * 3), 10);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let label = "Dangerous";
  if (finalScore >= 75) label = "Trusted";
  else if (finalScore >= 55) label = "Likely Safe";
  else if (finalScore >= 40) label = "Uncertain";
  else if (finalScore >= 25) label = "Suspicious";

  return {
    score: finalScore,
    label,
    totalReports: rawTotal,
    ...(collusionFlags?.suspicious ? { manipulationWarning: true } : {}),
  };
}