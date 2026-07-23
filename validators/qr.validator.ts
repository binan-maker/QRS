// ─── QR Validators ────────────────────────────────────────────────────────────
// Centralized validation for QR code content and configuration.
// Previously duplicated in: registry.ts, templates.ts, qr-validator.ts.
//
// NOTE: Deep security validation of QR payloads (injection patterns, blocked
// schemes, EMV/UPI parsing) lives in services/analysis/qr-validator.ts — that
// is a backend security service, not a field validator.

import { ValidationError } from "@/lib/errors";

// ── URL ───────────────────────────────────────────────────────────────────────

/** Fast URL validation — same heuristics used across the generator. */
export interface FieldValidation {
  valid: boolean;
  error?: string;
}

export function validateUrl(value: string): FieldValidation {
  const trimmed = value.trim();
  if (!trimmed) return { valid: false, error: "URL is required" };

  // Allow common scheme-less entries
  const toTest = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(toTest);
    if (!parsed.hostname.includes(".")) {
      return { valid: false, error: "Enter a valid URL with a domain" };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Enter a valid URL" };
  }
}

export function assertUrl(url: string): void {
  const r = validateUrl(url);
  if (!r.valid) throw new ValidationError(r.error!, "url");
}

/**
 * URL validator shaped as `(v: string) => string | null` for use in
 * `TemplateField.validate` and other form-field validate callbacks.
 * Returns the error message string on failure, or null on success.
 */
export function validateUrlField(value: string): string | null {
  const r = validateUrl(value);
  return r.valid ? null : (r.error ?? "Enter a valid URL");
}

// ── WhatsApp number ───────────────────────────────────────────────────────────

const WA_MIN_DIGITS = 10;

export function validateWhatsAppNumber(phone: string): FieldValidation {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < WA_MIN_DIGITS) {
    return { valid: false, error: `Enter at least ${WA_MIN_DIGITS} digits` };
  }
  return { valid: true };
}

// ── Phone (tel:) ──────────────────────────────────────────────────────────────

const TEL_MIN_DIGITS = 7;

export function validatePhoneNumber(phone: string): FieldValidation {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < TEL_MIN_DIGITS) {
    return { valid: false, error: `Enter at least ${TEL_MIN_DIGITS} digits` };
  }
  return { valid: true };
}

// ── Email ─────────────────────────────────────────────────────────────────────
// Intentionally kept simple — duplicating from auth.validator to keep this
// file self-contained for QR generator use (email in business QRs etc.)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateQrEmail(email: string): FieldValidation {
  if (!email.trim()) return { valid: false, error: "Email is required" };
  if (!EMAIL_REGEX.test(email.trim())) return { valid: false, error: "Enter a valid email address" };
  return { valid: true };
}

