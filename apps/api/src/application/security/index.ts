/**
 * @application/security — Security analysis use cases
 */

import type { ISecurityRepository, UrlRisk } from "../../domain/security";
import { computeUrlRisk } from "../../domain/security";

// ─── AnalyseQrContentUseCase ──────────────────────────────────────────────────

export interface AnalysisResult {
  url: string;
  risk: UrlRisk;
  analysedAt: Date;
}

export class AnalyseQrContentUseCase {
  constructor(private readonly securityRepo: ISecurityRepository) {}

  async execute(url: string): Promise<AnalysisResult> {
    const [patterns, isBlacklisted] = await Promise.all([
      this.securityRepo.getThreatPatterns(),
      this.securityRepo.isBlacklisted(url),
    ]);

    const risk = computeUrlRisk(url, patterns);

    if (isBlacklisted) {
      risk.isBlacklisted = true;
      risk.level = "dangerous";
      risk.score = Math.max(risk.score, 0.95);
      risk.reasons.unshift("URL is on the BinRo blacklist");
    }

    return { url, risk, analysedAt: new Date() };
  }
}
