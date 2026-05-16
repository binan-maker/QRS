import { analyzeUrl } from "@/lib/analysis/url-security-analyzer";
import { detectScam } from "@/lib/analysis/scam-detector";

export interface SecurityCheckResult {
  hasThreat:    boolean;
  warnings:     string[];
  riskLevel:    "caution" | "dangerous";
  riskScore:    number;
  scamDetected: boolean;
  scamDetails:  any;
}

/**
 * Run URL security and scam analysis in one call.
 * Replaces the three identical inline analysis blocks that existed in useScanner.
 */
export function runSecurityCheck(content: string): SecurityCheckResult {
  const urlAnalysis  = analyzeUrl(content);
  const scamAnalysis = detectScam(content);

  const warnings  = [...urlAnalysis.warnings, ...scamAnalysis.warnings];
  const hasThreat =
    warnings.length > 0 ||
    urlAnalysis.riskScore >= 30 ||
    scamAnalysis.isScamLikely;

  const riskLevel: "caution" | "dangerous" =
    urlAnalysis.riskScore >= 50 || scamAnalysis.confidence >= 50
      ? "dangerous"
      : "caution";

  return {
    hasThreat,
    warnings,
    riskLevel,
    riskScore:    urlAnalysis.riskScore,
    scamDetected: scamAnalysis.isScamLikely,
    scamDetails:  scamAnalysis,
  };
}
