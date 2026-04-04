import type { TrustScore } from "./types";

export type { TrustScore };

export function calculateTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>,
  collusionFlags?: {
    suspicious: boolean;
    safeWeightMultiplier?: number;
    negativeWeightMultiplier?: number;
  }
): TrustScore {
  const rawSafe  = reportCounts.safe  || 0;
  const rawScam  = reportCounts.scam  || 0;
  const rawFake  = reportCounts.fake  || 0;
  const rawSpam  = reportCounts.spam  || 0;
  const rawTotal = rawSafe + rawScam + rawFake + rawSpam;

  if (rawTotal === 0) return { score: -1, label: "Unrated", totalReports: 0 };

  const useWeighted = weightedCounts && Object.keys(weightedCounts).length > 0;
  let wSafe  = useWeighted ? (weightedCounts!.safe  || 0) : rawSafe;
  let wScam  = useWeighted ? (weightedCounts!.scam  || 0) : rawScam;
  let wFake  = useWeighted ? (weightedCounts!.fake  || 0) : rawFake;
  let wSpam  = useWeighted ? (weightedCounts!.spam  || 0) : rawSpam;

  // Apply collusion multipliers if suspicious patterns were detected
  if (collusionFlags?.suspicious) {
    const safeMult = collusionFlags.safeWeightMultiplier ?? 1;
    const negMult  = collusionFlags.negativeWeightMultiplier ?? 1;
    wSafe *= safeMult;
    wScam *= negMult;
    wFake *= negMult;
    wSpam *= negMult;
  } else {
    // Standard skepticism for new QRs with few reports dominated by negative votes
    const wNeg = wScam + wFake + wSpam;
    const wPos = wSafe;
    if (useWeighted && rawTotal < 15 && wNeg > wPos * 2) {
      const skepticism = 0.65;
      wScam *= skepticism;
      wFake *= skepticism;
      wSpam *= skepticism;
    }
  }

  const wTotal = wSafe + wScam + wFake + wSpam;
  if (wTotal === 0) return { score: -1, label: "Unrated", totalReports: rawTotal };

  const safeRatio = wSafe / wTotal;

  // Confidence ramps up with more reports, max at 20 (raised from 10 for reliability)
  const confidence = Math.min(rawTotal / 20, 1);

  // If suspicious flag is set and confidence is low, show Uncertain rather than polarized
  let score: number;
  if (collusionFlags?.suspicious && rawTotal < 15) {
    // Clamp score closer to 50 when manipulation is suspected and data is thin
    score = 50 + (safeRatio * 100 - 50) * confidence * 0.3;
  } else {
    score = 50 + (safeRatio * 100 - 50) * confidence;
  }

  let label = "Dangerous";
  if (score >= 75) label = "Trusted";
  else if (score >= 55) label = "Likely Safe";
  else if (score >= 40) label = "Uncertain";
  else if (score >= 25) label = "Suspicious";

  return {
    score: Math.round(score),
    label,
    totalReports: rawTotal,
    ...(collusionFlags?.suspicious ? { manipulationWarning: true } : {}),
  } as TrustScore & { manipulationWarning?: boolean };
}
