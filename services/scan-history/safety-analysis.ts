/**
 * Per-item scan safety analysis — pure function, no side-effects.
 * Delegates to the existing analysis service layer.
 */
import { parseAnyPaymentQr, analyzeAnyPaymentQr, analyzeUrlHeuristics } from "@/services/analysis";

export type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

export interface ScanItemLike {
  id: string;
  content: string;
  contentType: string;
}

/**
 * Determine the risk level for a single scan history item.
 * Returns "safe" for non-URL, non-payment types.
 */
export function analyzeItemRisk(item: ScanItemLike): RiskLevel {
  try {
    if (item.contentType === "url") {
      return analyzeUrlHeuristics(item.content).riskLevel as RiskLevel;
    }
    if (item.contentType === "payment") {
      const parsed = parseAnyPaymentQr(item.content);
      return parsed ? (analyzeAnyPaymentQr(parsed).riskLevel as RiskLevel) : "safe";
    }
  } catch {
    // analysis errors are non-fatal
  }
  return "safe";
}

/**
 * Build a risk map for an array of scan items.
 * Synchronous — call from within a batch loop (caller handles chunking/yielding).
 */
export function buildRiskMap(items: ScanItemLike[]): Map<string, RiskLevel> {
  const map = new Map<string, RiskLevel>();
  for (const item of items) {
    map.set(item.id, analyzeItemRisk(item));
  }
  return map;
}
