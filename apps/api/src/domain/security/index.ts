/**
 * @domain/security — URL & Content Security domain
 *
 * Consolidates the three duplicate URL risk implementations found in the codebase:
 *   - shared/utils/url-risk.ts (mobile)
 *   - server/routes.ts DYNAMIC_THREAT_PATTERNS (inline)
 *   - apps/api/src/security/ (Express middleware)
 *
 * Phase 3 target: single source of truth; DB-driven patterns (threat_patterns table).
 */

// ─── Value Objects ────────────────────────────────────────────────────────────

export type RiskLevel = "safe" | "suspicious" | "dangerous";

export interface UrlRisk {
  level: RiskLevel;
  score: number;       // 0.0 – 1.0 (higher = more risky)
  reasons: string[];
  isPhishing: boolean;
  isBlacklisted: boolean;
}

export interface ThreatPattern {
  id: string;
  pattern: string;     // regex string
  category: "phishing" | "malware" | "scam" | "impersonation";
  severity: "low" | "medium" | "high";
  description: string;
}

// ─── Static India-specific patterns (Phase 3: moved to DB) ───────────────────

export const INDIA_PHISHING_PATTERNS: ReadonlyArray<Pick<ThreatPattern, "pattern" | "category" | "severity">> = [
  { pattern: "paytm-verify\\.com",       category: "phishing",     severity: "high" },
  { pattern: "sbi-secure-login\\.com",   category: "phishing",     severity: "high" },
  { pattern: "npci-kyc\\.in",            category: "phishing",     severity: "high" },
  { pattern: "uidai-update\\.com",       category: "impersonation", severity: "high" },
  { pattern: "rewards\\.you-won",        category: "scam",         severity: "medium" },
  { pattern: "free-recharge\\.in",       category: "scam",         severity: "medium" },
];

// ─── Pure Domain Functions ────────────────────────────────────────────────────

/**
 * Compute URL risk using a set of threat patterns.
 * Pure function — no I/O. Pass compiled patterns as input.
 */
export function computeUrlRisk(url: string, patterns: ThreatPattern[]): UrlRisk {
  const reasons: string[] = [];
  let score = 0;
  let isPhishing = false;

  for (const p of patterns) {
    try {
      if (new RegExp(p.pattern, "i").test(url)) {
        reasons.push(`${p.category}: ${p.description || p.pattern}`);
        if (p.severity === "high")   score = Math.max(score, 0.9);
        if (p.severity === "medium") score = Math.max(score, 0.5);
        if (p.severity === "low")    score = Math.max(score, 0.2);
        if (p.category === "phishing" || p.category === "impersonation") {
          isPhishing = true;
        }
      }
    } catch {
      // Invalid regex in DB — skip
    }
  }

  // Heuristic checks
  if (/\b(verify|kyc|update|secure|login)\b.{0,20}\.(tk|ml|cf|ga|gq)\b/i.test(url)) {
    reasons.push("Suspicious TLD combined with trust-baiting keyword");
    score = Math.max(score, 0.7);
  }
  if (/[а-яё]/i.test(url)) {
    reasons.push("Cyrillic lookalike characters detected");
    score = Math.max(score, 0.8);
    isPhishing = true;
  }

  const level: RiskLevel =
    score >= 0.7 ? "dangerous" :
    score >= 0.3 ? "suspicious" :
    "safe";

  return { level, score, reasons, isPhishing, isBlacklisted: false };
}

// ─── Repository Port ──────────────────────────────────────────────────────────

export interface ISecurityRepository {
  /** Returns all active threat patterns (cached in Redis, 5-min TTL). */
  getThreatPatterns(): Promise<ThreatPattern[]>;
  addThreatPattern(pattern: Omit<ThreatPattern, "id">): Promise<ThreatPattern>;
  removeThreatPattern(id: string): Promise<void>;
  isBlacklisted(url: string): Promise<boolean>;
}
