// ─── QR Validators ────────────────────────────────────────────────────────────
// Centralized validation for QR code content and configuration.
// Previously duplicated in: registry.ts, templates.ts, qr-validator.ts.

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

// ── QR content general ────────────────────────────────────────────────────────

const MAX_QR_CONTENT_BYTES = 2953; // QR v40 binary max

export function validateQrContent(content: string): FieldValidation {
  if (!content.trim()) return { valid: false, error: "QR content cannot be empty" };
  const bytes = new TextEncoder().encode(content).length;
  if (bytes > MAX_QR_CONTENT_BYTES) {
    return {
      valid: false,
      error: `Content too long — maximum is ${MAX_QR_CONTENT_BYTES} bytes`,
    };
  }
  return { valid: true };
}

export function assertQrContent(content: string): void {
  const r = validateQrContent(content);
  if (!r.valid) throw new ValidationError(r.error!, "content");
}
