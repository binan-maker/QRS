/**
 * QR Engine — URL Analyzer
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyses a URL and returns a score delta + flags.
 * Used by the trust scorer for URL-based QR types.
 */

import type { TrustFlag } from "../types";

interface UrlAnalysis {
  scoreDelta: number;
  flags: TrustFlag[];
}

// Legitimate short-link services (not suspicious)
const TRUSTED_SHORTENERS = new Set([
  "bit.ly", "goo.gl", "t.co", "ow.ly", "buff.ly",
  "dlvr.it", "tinyurl.com", "rebrand.ly",
  // Indian
  "in.gr", "qr.page",
]);

// Suspicious / anonymous shorteners
const UNTRUSTED_SHORTENERS = new Set([
  "grabify.link", "iplogger.org", "2no.co", "yip.su",
  "0x3.me", "iplogger.com", "blasze.com", "ps.kz",
  "api.e-sim.lt",
]);

// High-reputation domains that deserve a trust boost
const VERIFIED_DOMAINS = new Set([
  // Indian gov + banking
  "npci.org.in", "upi.npci.org.in", "bhimupi.org.in",
  "sbi.co.in", "hdfcbank.com", "icicibank.com", "axisbank.com",
  // Global
  "google.com", "apple.com", "microsoft.com", "amazon.com",
  "youtube.com", "github.com", "wikipedia.org",
]);

export function analyzeUrl(content: string): UrlAnalysis {
  const flags: TrustFlag[] = [];
  let scoreDelta = 0;

  let url: URL | null = null;
  try {
    url = new URL(content.startsWith("http") ? content : `https://${content}`);
  } catch {
    return { scoreDelta: -5, flags: ["suspicious_domain"] };
  }

  const hostname = url.hostname.replace(/^www\./, "");

  // ── HTTP (not HTTPS) ───────────────────────────────────────────────────────
  if (url.protocol === "http:") {
    scoreDelta -= 10;
    flags.push("suspicious_domain");
  }

  // ── Verified high-reputation domain ───────────────────────────────────────
  if (VERIFIED_DOMAINS.has(hostname)) {
    scoreDelta += 15;
  }

  // ── Trusted URL shortener ─────────────────────────────────────────────────
  if (TRUSTED_SHORTENERS.has(hostname)) {
    flags.push("url_shortener");
    // We flag it but don't penalize — trusted shorteners are legitimate
  }

  // ── Suspicious shortener (tracking / IP-logging) ─────────────────────────
  if (UNTRUSTED_SHORTENERS.has(hostname)) {
    scoreDelta -= 35;
    flags.push("url_shortener");
    flags.push("suspicious_domain");
  }

  // ── Redirect chain indicators ─────────────────────────────────────────────
  const hasRedirectParam =
    url.searchParams.has("redirect") ||
    url.searchParams.has("url") ||
    url.searchParams.has("goto") ||
    url.searchParams.has("redir") ||
    url.searchParams.has("target");

  if (hasRedirectParam) {
    scoreDelta -= 10;
    flags.push("redirect_chain");
  }

  // ── Excessive subdomains (e.g. login.secure.bank.example.tk) ─────────────
  const subdomainCount = url.hostname.split(".").length - 2;
  if (subdomainCount >= 3) {
    scoreDelta -= 8;
    flags.push("suspicious_domain");
  }

  // ── Very long URLs (obfuscation technique) ────────────────────────────────
  if (content.length > 500) {
    scoreDelta -= 5;
  }

  return { scoreDelta, flags: [...new Set(flags)] as TrustFlag[] };
}
