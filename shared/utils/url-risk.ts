/**
 * Re-export shim — logic has moved to the analysis service layer.
 * Import from "@/services/analysis/url-risk" for new code.
 */
export type { UrlRiskResult } from "@/services/analysis/url-risk";
export { computeUrlRisk } from "@/services/analysis/url-risk";
