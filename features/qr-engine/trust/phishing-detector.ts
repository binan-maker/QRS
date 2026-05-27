/**
 * QR Engine — Phishing & Malware Pattern Detector
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure heuristic analysis. No network calls. Runs synchronously.
 * Detects known phishing patterns, credential-harvesting pages, and
 * common QR-code scam techniques.
 */

import type { TrustFlag } from "../types";

interface PhishingResult {
  detected: boolean;
  penalty: number;
  flags: TrustFlag[];
}

// ── Patterns that indicate phishing / malware ─────────────────────────────
const PHISHING_KEYWORDS = [
  "verify-account", "account-verify", "confirm-identity", "secure-login",
  "update-payment", "billing-update", "unusual-activity", "suspended-account",
  "click-here-to-verify", "free-iphone", "you-won", "congratulations",
  "claim-your-prize", "free-gift", "win-a-prize", "limited-offer",
  "act-now", "urgent-action", "immediate-response",
];

const BANKING_SQUATTERS = [
  /sbi-?secure/i, /hdfc-?verify/i, /icici-?update/i, /axis-?bank-?confirm/i,
  /paytm-?[a-z]+-?verify/i, /phonepe-?[a-z]+-?confirm/i,
  /gpay-?secure/i, /upi-?refund/i, /neft-?reversal/i,
];

const BRAND_SQUATTERS = [
  // Major Indian payment brands
  /pay[t]m\.(?!one|mall|money)[a-z]+\./i,
  /phonepe\.(?!com)[a-z]+\./i,
  /googlepay-[a-z]+\./i,
  // International
  /paypa1\./i, /paypai\./i, /paypa-l\./i,
  /amaz[o0]n\./i, /faceb[o0][o0]k\./i,
  /g[o0][o0]gle\./i, /micr[o0]s[o0]ft\./i,
];

const SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".work", ".click"];

export function detectPhishingPattern(content: string): PhishingResult {
  const lower = content.toLowerCase();
  const flags: TrustFlag[] = [];
  let penalty = 0;

  // ── 1. Keyword matching ────────────────────────────────────────────────────
  const keywordHits = PHISHING_KEYWORDS.filter((kw) => lower.includes(kw));
  if (keywordHits.length > 0) {
    penalty += Math.min(keywordHits.length * 12, 40);
    flags.push("phishing_pattern");
  }

  // ── 2. Banking brand squatting ────────────────────────────────────────────
  const bankSquatHit = BANKING_SQUATTERS.some((p) => p.test(content));
  if (bankSquatHit) {
    penalty += 45;
    flags.push("typosquatting");
    flags.push("phishing_pattern");
  }

  // ── 3. Brand squatting ────────────────────────────────────────────────────
  const brandSquatHit = BRAND_SQUATTERS.some((p) => p.test(content));
  if (brandSquatHit) {
    penalty += 40;
    flags.push("typosquatting");
  }

  // ── 4. Suspicious TLDs ────────────────────────────────────────────────────
  const tldHit = SUSPICIOUS_TLDS.some((tld) => lower.includes(tld + "/") || lower.endsWith(tld));
  if (tldHit) {
    penalty += 15;
    flags.push("suspicious_domain");
  }

  // ── 5. IP address URLs (never used by legit services in QR) ───────────────
  const ipUrlPattern = /https?:\/\/(\d{1,3}\.){3}\d{1,3}/;
  if (ipUrlPattern.test(content)) {
    penalty += 30;
    flags.push("ip_address_url");
  }

  // ── 6. Data URI / javascript: injection ──────────────────────────────────
  if (lower.startsWith("data:") || lower.startsWith("javascript:")) {
    penalty += 60;
    flags.push("malicious_url");
  }

  return {
    detected: penalty > 0,
    penalty,
    flags: [...new Set(flags)] as TrustFlag[],
  };
}
