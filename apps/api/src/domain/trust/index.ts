/**
 * @domain/trust — Trust Scoring domain
 *
 * Pure business logic — no I/O.
 * Extracted from services/server-verify-types.ts and server-collusion.ts.
 */

// ─── Value Objects ────────────────────────────────────────────────────────────

export type TrustTier = 0 | 1 | 2 | 3;

export interface TrustSignals {
  reportCount: number;
  reportWeight: number;        // sum of weighted reports
  scanCount: number;
  ownerVerified: boolean;
  ownerAccountAgeDays: number;
  collusionSuspected: boolean;
  collusionMultiplier: number; // 0.1–1.0
}

export interface TrustScore {
  score: number;     // 0.0 – 1.0 (higher = more trusted)
  tier: TrustTier;
  label: "safe" | "caution" | "flagged" | "unknown";
  flags: string[];
}

// ─── Pure Domain Functions ────────────────────────────────────────────────────

export function computeTrustScore(signals: TrustSignals): TrustScore {
  const flags: string[] = [];
  let score = 1.0;

  // Weighted report penalty
  if (signals.reportWeight > 0) {
    const penalty = Math.min(signals.reportWeight * 0.15, 0.9);
    score -= penalty;
    if (penalty > 0.3) flags.push("high_report_weight");
  }

  // Collusion multiplier (reduces the trust-boosting effect of scans)
  if (signals.collusionSuspected) {
    score *= signals.collusionMultiplier;
    flags.push("collusion_suspected");
  }

  // Verified owner bonus
  if (signals.ownerVerified) {
    score = Math.min(score + 0.1, 1.0);
  }

  // Account age factor
  if (signals.ownerAccountAgeDays < 7) {
    score *= 0.8;
    flags.push("new_account");
  }

  score = Math.max(0, Math.min(1, score));

  const tier  = scoreTier(score);
  const label = tierLabel(tier);

  return { score, tier, label, flags };
}

function scoreTier(score: number): TrustTier {
  if (score >= 0.7) return 3;
  if (score >= 0.5) return 2;
  if (score >= 0.3) return 1;
  return 0;
}

function tierLabel(tier: TrustTier): TrustScore["label"] {
  switch (tier) {
    case 3: return "safe";
    case 2: return "caution";
    case 1: return "flagged";
    default: return "unknown";
  }
}

// ─── Repository Port ──────────────────────────────────────────────────────────

export interface ITrustRepository {
  getTrustSignals(qrId: string): Promise<TrustSignals>;
  saveTrustScore(qrId: string, score: TrustScore): Promise<void>;
}
