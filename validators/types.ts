// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATOR TYPES — Common validation result interfaces
// ───────────────────────────────────────────────────────────────────────────────
// Reusable validation result structure used across all validator modules.
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Aliases for contextual clarity while sharing the same underlying shape
export type FieldValidation = ValidationResult;
export type EmailValidation = ValidationResult;
export type PasswordValidation = ValidationResult;
