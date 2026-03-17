import type { TrustScore } from "./types";

export type { TrustScore };

export function calculateTrustScore(
  reportCounts: Record<string, number>,
  weightedCounts?: Record<string, number>
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

  const wNeg = wScam + wFake + wSpam;
  const wPos = wSafe;
  if (useWeighted && rawTotal < 15 && wNeg > wPos * 2) {
    const skepticism = 0.65;
    wScam *= skepticism;
    wFake *= skepticism;
    wSpam *= skepticism;
  }

  const wTotal = wSafe + wScam + wFake + wSpam;
  if (wTotal === 0) return { score: -1, label: "Unrated", totalReports: rawTotal };

  const safeRatio = wSafe / wTotal;
  const confidence = Math.min(rawTotal / 10, 1);
  let score = safeRatio * 100;
  score = 50 + (score - 50) * confidence;

  let label = "Dangerous";
  if (score >= 75) label = "Trusted";
  else if (score >= 55) label = "Likely Safe";
  else if (score >= 40) label = "Uncertain";
  else if (score >= 25) label = "Suspicious";
  return { score: Math.round(score), label, totalReports: rawTotal };
}
