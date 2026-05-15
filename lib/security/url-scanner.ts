/**
 * Unified URL Security Scanner
 *
 * Single entry point for all URL validation and threat detection used
 * before any destination change is saved — works identically for both
 * Saved and Business QR codes.
 *
 * Pipeline (in order):
 *  1. Format validation (sync)
 *  2. IP / private-network block (sync)
 *  3. URL-shortener block (sync)
 *  4. Local heuristics — typosquatting, homograph, suspicious TLD (sync)
 *  5. Google Safe Browsing via backend proxy (async, optional)
 */

import { analyzeUrl } from "./url-security-analyzer";
import { analyzeUrlThreatIntelligence } from "./threat-intelligence";

export interface UrlScanResult {
  valid: boolean;
  error?: string;
  threatType?: string | null;
  riskScore?: number;
  riskLevel?: string;
  warnings?: string[];
  source?: "local" | "google-safe-browsing" | "api-unavailable";
}

const BLOCKED_SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "ow.ly", "is.gd", "buff.ly",
  "adf.ly", "j.mp", "short.link", "rebrand.ly", "cutt.ly", "rb.gy",
];

const PRIVATE_PREFIXES = ["192.168.", "10.", "172.16.", "172.17.", "172.18.",
  "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
  "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31."];

function normalise(raw: string): string {
  if (!raw || typeof raw !== "string") return "https://invalid.invalid";
  const t = raw.trim();
  return t.startsWith("http") ? t : `https://${t}`;
}

/**
 * Runs the full validation + scanning pipeline.
 *
 * The call is async because step 5 (Google Safe Browsing) requires a network
 * round-trip. Steps 1-4 are synchronous and complete in < 1 ms.
 */
export async function scanUrl(raw: string): Promise<UrlScanResult> {
  const normalised = normalise(raw);

  // ── 1. Format ──────────────────────────────────────────────────────────────
  let parsed: URL;
  try {
    parsed = new URL(normalised);
  } catch {
    return { valid: false, error: "Please enter a valid URL (e.g. https://example.com)." };
  }

  const host = parsed.hostname.toLowerCase();

  // ── 2. IP / private network ────────────────────────────────────────────────
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { valid: false, error: "IP addresses are not allowed as destinations for security reasons." };
  }
  if (host === "localhost" || host === "::1" || host.endsWith(".local") ||
      PRIVATE_PREFIXES.some((p) => host.startsWith(p))) {
    return { valid: false, error: "Private or local network addresses cannot be used as destinations." };
  }

  // ── 3. URL shorteners ──────────────────────────────────────────────────────
  if (BLOCKED_SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
    return { valid: false, error: "URL shorteners are blocked to prevent hidden redirects. Use the full destination URL." };
  }

  // ── 4. Local heuristics (typosquatting, homograph, suspicious TLD) ─────────
  const localAnalysis = analyzeUrl(normalised);
  if (localAnalysis.isUrl && localAnalysis.riskLevel === "critical") {
    const topWarning = localAnalysis.warnings[0] ?? "URL flagged by local security analysis.";
    return {
      valid: false,
      error: topWarning,
      riskScore: localAnalysis.riskScore,
      riskLevel: localAnalysis.riskLevel,
      warnings: localAnalysis.warnings,
      source: "local",
    };
  }

  // ── 5. Google Safe Browsing (async) ────────────────────────────────────────
  try {
    const intel = await analyzeUrlThreatIntelligence(normalised);
    if (intel.isThreat) {
      return {
        valid: false,
        error: intel.label || "URL flagged as unsafe by Google Safe Browsing.",
        threatType: intel.threatType,
        source: "google-safe-browsing",
      };
    }
    return {
      valid: true,
      riskScore: localAnalysis.riskScore,
      riskLevel: localAnalysis.riskLevel,
      warnings: localAnalysis.warnings,
      source: intel.source === "google-safe-browsing" ? "google-safe-browsing" : "api-unavailable",
    };
  } catch {
    // Never block a save due to network failure in threat intel
    return {
      valid: true,
      riskScore: localAnalysis.riskScore,
      riskLevel: localAnalysis.riskLevel,
      warnings: localAnalysis.warnings,
      source: "api-unavailable",
    };
  }
}

/**
 * Synchronous fast-path check (steps 1-4 only, no network call).
 * Use this where you need an instant result and can afford to skip
 * the Google Safe Browsing check.
 */
export function scanUrlSync(raw: string): UrlScanResult {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: "Please enter a valid URL (e.g. https://example.com)." };
  }
  const normalised = normalise(raw);

  let parsed: URL;
  try {
    parsed = new URL(normalised);
  } catch {
    return { valid: false, error: "Please enter a valid URL (e.g. https://example.com)." };
  }

  const host = parsed.hostname.toLowerCase();

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { valid: false, error: "IP addresses are not allowed as destinations for security reasons." };
  }
  if (host === "localhost" || host === "::1" || host.endsWith(".local") ||
      PRIVATE_PREFIXES.some((p) => host.startsWith(p))) {
    return { valid: false, error: "Private or local network addresses cannot be used as destinations." };
  }
  if (BLOCKED_SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
    return { valid: false, error: "URL shorteners are blocked to prevent hidden redirects." };
  }

  const localAnalysis = analyzeUrl(normalised);
  if (localAnalysis.isUrl && localAnalysis.riskLevel === "critical") {
    const topWarning = localAnalysis.warnings[0] ?? "URL flagged by local security analysis.";
    return {
      valid: false,
      error: topWarning,
      riskScore: localAnalysis.riskScore,
      riskLevel: localAnalysis.riskLevel,
      warnings: localAnalysis.warnings,
      source: "local",
    };
  }

  return {
    valid: true,
    riskScore: localAnalysis.riskScore,
    riskLevel: localAnalysis.riskLevel,
    warnings: localAnalysis.warnings,
    source: "local",
  };
}
