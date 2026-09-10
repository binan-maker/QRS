/**
 * Client-side threat patterns served to the mobile app via GET /api/threats.
 *
 * These patterns are used by the mobile app for LOCAL, offline threat detection
 * (string-matching on QR content before the network call).
 *
 * Phase 3.7 target: move these into a `threat_patterns` PostgreSQL table
 * with an admin endpoint to add/update/remove patterns without redeploy.
 *
 * Format: { pattern: string (substring match), reason: string }
 * Different from domain/security/index.ts INDIA_PHISHING_PATTERNS which are
 * regex-based and used SERVER-SIDE for URL risk scoring.
 */

export interface ClientThreatPattern {
  pattern: string;
  reason: string;
}

export const CLIENT_THREAT_PATTERNS: ReadonlyArray<ClientThreatPattern> = [
  // Payment / banking impersonation
  { pattern: "support-paytm-helpline",   reason: "Paytm support impersonation" },
  { pattern: "sbi-reward-collect",        reason: "SBI reward scam" },
  { pattern: "hdfc-lucky-winner",         reason: "HDFC lucky draw fraud" },
  { pattern: "epfo-pf-withdrawal",        reason: "EPFO PF withdrawal scam" },

  // Government scheme fraud
  { pattern: "pm-awas-yojana-apply",      reason: "PM housing scheme fraud" },
  { pattern: "ncert-scholarship-apply",   reason: "Fake scholarship scam" },
  { pattern: "cbse-result-link",          reason: "CBSE phishing page" },
  { pattern: "army-recruitment-online",   reason: "Fake army recruitment" },
  { pattern: "trai-sim-block",            reason: "TRAI SIM block threat scam" },

  // Telecom scams
  { pattern: "free-data-airtel",          reason: "Airtel free data scam" },
  { pattern: "whatsapp-gold-upgrade",     reason: "WhatsApp Gold scam" },
];
