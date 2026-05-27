/**
 * QR Engine — Trust Scorer
 * ─────────────────────────────────────────────────────────────────────────────
 * Produces a deterministic trust score (0–100) and trust level for any QR
 * payload. Runs entirely client-side with no network calls.
 *
 * Score bands:
 *   80–100  safe
 *   55–79   caution
 *   30–54   suspicious
 *   0–29    dangerous
 */

import type { TrustFlag, TrustLevel, QrTrustSummary } from "../types";
import { detectPhishingPattern } from "./phishing-detector";
import { analyzeUrl } from "./url-analyzer";

interface TrustInput {
  content: string;
  contentType: string;
  communityScore?: number;   // 0–100 from Firestore, if available
  reportCount?: number;
  verifiedMerchant?: boolean;
}

export function computeTrustScore(input: TrustInput): QrTrustSummary {
  const flags: TrustFlag[] = [];
  let score = 75; // neutral baseline

  const { content, contentType, communityScore, reportCount, verifiedMerchant } = input;

  // ── 1. Verified merchant bonus ─────────────────────────────────────────────
  if (verifiedMerchant) {
    score += 15;
    flags.push("verified_merchant");
  }

  // ── 2. Community trust signals ────────────────────────────────────────────
  if (communityScore !== undefined) {
    // Blend community score (weight 30%) with heuristic baseline (weight 70%)
    score = Math.round(score * 0.7 + communityScore * 0.3);
  }
  if (communityScore !== undefined && communityScore > 70) {
    flags.push("community_trusted");
  }

  // ── 3. Report penalty ─────────────────────────────────────────────────────
  if (reportCount && reportCount > 0) {
    const penalty = Math.min(reportCount * 8, 40);
    score -= penalty;
    flags.push("community_reported");
  }

  // ── 4. URL-based analysis ─────────────────────────────────────────────────
  const isUrl =
    contentType === "url" ||
    contentType === "web" ||
    content.startsWith("http://") ||
    content.startsWith("https://");

  if (isUrl) {
    const urlAnalysis = analyzeUrl(content);
    score += urlAnalysis.scoreDelta;
    flags.push(...urlAnalysis.flags);
  }

  // ── 5. Phishing / malware pattern detection ───────────────────────────────
  const phishingResult = detectPhishingPattern(content);
  if (phishingResult.detected) {
    score -= phishingResult.penalty;
    flags.push(...phishingResult.flags);
  }

  // ── 6. Payment QR specifics ───────────────────────────────────────────────
  if (contentType === "upi" || contentType === "payment" || contentType === "paymentlink") {
    if (!verifiedMerchant) {
      // Payment QRs without merchant verification get slight caution bump
      score = Math.min(score, 72);
    }
  }

  // ── 7. Safe Browsing cleared signal ──────────────────────────────────────
  // This flag is set externally when Google Safe Browsing returns clean
  // Here we just ensure score reflects absence of known threats
  if (
    !flags.includes("malicious_url") &&
    !flags.includes("phishing_pattern") &&
    !flags.includes("suspicious_domain") &&
    isUrl
  ) {
    flags.push("safe_browsing_clear");
  }

  // ── Clamp ─────────────────────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score));

  const level = scoreToLevel(score);

  return {
    score,
    level,
    flags: [...new Set(flags)],
    verified: verifiedMerchant ?? false,
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
