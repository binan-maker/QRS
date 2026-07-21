// ─── Settings Validators ──────────────────────────────────────────────────────
// Validation for user settings updates.

import { ValidationError } from "@/lib/errors";

export interface FieldValidation {
  valid: boolean;
  error?: string;
}

export type AppTheme = "light" | "dark" | "system";
export type AppLanguage = string; // ISO 639-1

const VALID_THEMES: AppTheme[] = ["light", "dark", "system"];
const SUPPORTED_LANGUAGES = ["en", "hi", "ml", "ta", "te"];

export function validateTheme(theme: string): FieldValidation {
  if (!VALID_THEMES.includes(theme as AppTheme)) {
    return { valid: false, error: `Theme must be one of: ${VALID_THEMES.join(", ")}` };
  }
  return { valid: true };
}

export function validateLanguage(lang: string): FieldValidation {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return {
      valid: false,
      error: `Language must be one of: ${SUPPORTED_LANGUAGES.join(", ")}`,
    };
  }
  return { valid: true };
}

export function assertTheme(theme: string): void {
  const r = validateTheme(theme);
  if (!r.valid) throw new ValidationError(r.error!, "theme");
}

export function assertLanguage(lang: string): void {
  const r = validateLanguage(lang);
  if (!r.valid) throw new ValidationError(r.error!, "language");
}

export const SUPPORTED_LANGUAGES_LIST = SUPPORTED_LANGUAGES;
export const VALID_THEMES_LIST = VALID_THEMES;
