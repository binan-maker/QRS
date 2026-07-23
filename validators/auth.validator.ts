// ─── Auth Validators ──────────────────────────────────────────────────────────
// Centralizes all authentication input validation.
// Previously duplicated inline in ForgotPasswordScreen, RegisterScreen, etc.

import { ValidationError } from "@/lib/errors";
import { validateEmail as _validateEmailFull } from "@/shared/utils/email-validator";

// ── Email ─────────────────────────────────────────────────────────────────────

export interface EmailValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validates an email address.
 * Delegates to the full email validator in shared/utils/email-validator.ts,
 * which includes disposable-domain blocking and heuristic pattern detection.
 * Returns { valid, error? } consistent with all other validators in this barrel.
 */
export function validateEmail(email: string): EmailValidation {
  if (!email.trim()) return { valid: false, error: "Email is required" };
  const result = _validateEmailFull(email);
  if (!result.valid) return { valid: false, error: result.reason };
  return { valid: true };
}

/** Throws `ValidationError` if the email is invalid. */
export function assertEmail(email: string): void {
  const result = validateEmail(email);
  if (!result.valid) throw new ValidationError(result.error!, "email");
}

// ── Password ──────────────────────────────────────────────────────────────────

const PASSWORD_MIN_LENGTH = 6;

export interface PasswordValidation {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidation {
  if (!password) return { valid: false, error: "Password is required" };
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }
  if (!/(?=.*[0-9])/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }
  return { valid: true };
}

/** Throws `ValidationError` if the password is invalid. */
export function assertPassword(password: string): void {
  const result = validatePassword(password);
  if (!result.valid) throw new ValidationError(result.error!, "password");
}

// ── Password confirmation ─────────────────────────────────────────────────────

export function validatePasswordMatch(
  password: string,
  confirmation: string
): PasswordValidation {
  if (password !== confirmation) {
    return { valid: false, error: "Passwords do not match" };
  }
  return { valid: true };
}

/** Throws `ValidationError` if passwords do not match. */
export function assertPasswordMatch(password: string, confirmation: string): void {
  const result = validatePasswordMatch(password, confirmation);
  if (!result.valid) throw new ValidationError(result.error!, "confirmPassword");
}
