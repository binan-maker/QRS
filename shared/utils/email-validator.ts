// ─── Disposable / Temporary Email Validator ───────────────────────────────────
// Blocks fake/throwaway email addresses at registration.
//
// Two-layer check:
//   1. Domain blocklist  — known temp-email providers (actively maintained list)
//   2. Heuristic signals — structural patterns common in disposable email services
//
// Used in:
//   • app/(auth)/register.tsx        (client-side, immediate feedback)
//   • contexts/AuthContext.tsx       (called before Firebase account creation)
//   • server/routes.ts               (server-side, bypass-proof gate)
// ──────────────────────────────────────────────────────────────────────────────

import { DISPOSABLE_DOMAINS } from "./disposable-domains";

// ── Heuristic: detect patterns common in disposable email services ─────────────
const SUSPICIOUS_PATTERNS = [
  /^(temp|trash|spam|fake|junk|throwaway|discard|noreply|no-reply|mailinator)/i,
  /\d{6,}@/,          // e.g. user123456@domain.com — bot-like
  /(temp|tmp|trash|spam|junk|fake|dispos|throwaway|burner)(mail|email|inbox|box)/i,
];

// ── Email format check ────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  const trimmed = email.trim().toLowerCase();

  // 1. Basic format
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, reason: "Please enter a valid email address." };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { valid: false, reason: "Please enter a valid email address." };
  }

  const domain = parts[1];

  // 2. Domain blocklist
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Temporary or disposable email addresses are not allowed. Please use a real email address.",
    };
  }

  // 3. Check subdomains of known disposable services
  //    e.g. xyz.mailinator.com, sub.yopmail.com
  const domainParts = domain.split(".");
  if (domainParts.length >= 3) {
    const parentDomain = domainParts.slice(-2).join(".");
    if (DISPOSABLE_DOMAINS.has(parentDomain)) {
      return {
        valid: false,
        reason: "Temporary or disposable email addresses are not allowed. Please use a real email address.",
      };
    }
  }

  // 4. Heuristic patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        reason: "This email address doesn't look valid. Please use your real email address.",
      };
    }
  }

  return { valid: true };
}
