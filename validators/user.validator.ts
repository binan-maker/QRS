// ─── User Validators ──────────────────────────────────────────────────────────
// Centralized validation for user profile fields.
// Source of truth for username, display name, and bio rules.
// Previously these rules were inline in RegisterScreen and username.ts.

import { ValidationError } from "@/lib/errors";
import {
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  USERNAME_REGEX,
  MAX_DISPLAY_NAME_LENGTH,
} from "@/shared/constants/config";

// ── Username ──────────────────────────────────────────────────────────────────

export interface FieldValidation {
  valid: boolean;
  error?: string;
}

export function validateUsername(username: string): FieldValidation {
  const trimmed = username.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: "Username is required" };
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
    };
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `Username must be ${MAX_USERNAME_LENGTH} characters or fewer`,
    };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, and underscores",
    };
  }
  return { valid: true };
}

/** Throws `ValidationError` if the username is invalid. */
export function assertUsername(username: string): void {
  const result = validateUsername(username);
  if (!result.valid) throw new ValidationError(result.error!, "username");
}

// ── Display name ──────────────────────────────────────────────────────────────

export function validateDisplayName(name: string): FieldValidation {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Display name is required" };
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      valid: false,
      error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`,
    };
  }
  return { valid: true };
}

/** Throws `ValidationError` if the display name is invalid. */
export function assertDisplayName(name: string): void {
  const result = validateDisplayName(name);
  if (!result.valid) throw new ValidationError(result.error!, "displayName");
}

// ── Phone number ──────────────────────────────────────────────────────────────

/** E.164 or local formats: +91XXXXXXXXXX, or 7-15 digits. */
const PHONE_REGEX = /^\+?\d{7,15}$/;

export function validatePhone(phone: string): FieldValidation {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (!cleaned) return { valid: false, error: "Phone number is required" };
  if (!PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: "Enter a valid phone number (7–15 digits)" };
  }
  return { valid: true };
}

// ── Bio ───────────────────────────────────────────────────────────────────────

const MAX_BIO_LENGTH = 160;

export function validateBio(bio: string): FieldValidation {
  if (bio.length > MAX_BIO_LENGTH) {
    return {
      valid: false,
      error: `Bio must be ${MAX_BIO_LENGTH} characters or fewer`,
    };
  }
  return { valid: true };
}
