/**
 * QR Engine — Trust Scorer
 * ─────────────────────────────────────────────────────────────────────────────
 * Produces a community trust score (0–100) from supplied community data.
 * This module intentionally does not inspect QR payloads, URLs, domains, or
 * keywords.
 *
 * Score bands:
 *   80–100  safe
 *   55–79   caution
 *   30–54   suspicious
 *   0–29    dangerous
 */

import type { TrustFlag, TrustLevel, QrTrustSummary } from "../types";

interface TrustInput {
  communityScore?: number;   // 0–100 from Firestore, if available
  reportCount?: number;
}

export function computeTrustScore(input: TrustInput): QrTrustSummary {
  const flags: TrustFlag[] = [];
  const { communityScore, reportCount } = input;
  const hasCommunityScore = typeof communityScore === "number" && Number.isFinite(communityScore);
  const score = hasCommunityScore ? Math.max(0, Math.min(100, Math.round(communityScore))) : 0;

  if (communityScore !== undefined && communityScore > 70) {
    flags.push("community_trusted");
  }

  if (reportCount && reportCount > 0) {
    flags.push("community_reported");
  }

  const level = hasCommunityScore ? scoreToLevel(score) : "unknown";

  return {
    score,
    level,
    flags: [...new Set(flags)],
    verified: false,
    last_analyzed_at: Date.now(),
  };
}

export function scoreToLevel(score: number): TrustLevel {
  if (score >= 80) return "safe";
  if (score >= 55) return "caution";
  if (score >= 30) return "suspicious";
  return "dangerous";
}

export function trustLevelColor(level: TrustLevel): string {
  switch (level) {
    case "safe":       return "#10B981";
    case "caution":    return "#F59E0B";
    case "suspicious": return "#EF4444";
    case "dangerous":  return "#DC2626";
    case "unknown":    return "#6B7280";
  }
}

export function trustLevelLabel(level: TrustLevel): string {
  switch (level) {
    case "safe":       return "Safe";
    case "caution":    return "Use Caution";
    case "suspicious": return "Suspicious";
    case "dangerous":  return "Dangerous";
    case "unknown":    return "Unknown";
  }
}

export function trustLevelIcon(level: TrustLevel): string {
  switch (level) {
    case "safe":       return "shield-checkmark-outline";
    case "caution":    return "warning-outline";
    case "suspicious": return "alert-circle-outline";
    case "dangerous":  return "skull-outline";
    case "unknown":    return "help-circle-outline";
  }
}
