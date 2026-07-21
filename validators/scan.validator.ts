// ─── Scan Validators ─────────────────────────────────────────────────────────
// Centralized validation for scan records and scan-related inputs.

import { ValidationError } from "@/lib/errors";

// ── Content length ─────────────────────────────────────────────────────────────

const MAX_SCAN_CONTENT_LENGTH = 4_096; // QR codes cap at ~4KB

export interface FieldValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate raw QR content before recording a scan.
 * Ensures content is present and within QR spec limits.
 */
export function validateScanContent(content: string): FieldValidation {
  if (!content || !content.trim()) {
    return { valid: false, error: "Scan content cannot be empty" };
  }
  if (content.length > MAX_SCAN_CONTENT_LENGTH) {
    return {
      valid: false,
      error: `Scan content exceeds maximum length (${MAX_SCAN_CONTENT_LENGTH} characters)`,
    };
  }
  return { valid: true };
}

/** Throws `ValidationError` if the scan content is invalid. */
export function assertScanContent(content: string): void {
  const result = validateScanContent(content);
  if (!result.valid) throw new ValidationError(result.error!, "content");
}

// ── Pagination ─────────────────────────────────────────────────────────────────

const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 100;

/**
 * Validate a page size parameter for paginated scan history queries.
 */
export function validatePageSize(pageSize: number): FieldValidation {
  if (!Number.isInteger(pageSize) || pageSize < MIN_PAGE_SIZE) {
    return {
      valid: false,
      error: `Page size must be at least ${MIN_PAGE_SIZE}`,
    };
  }
  if (pageSize > MAX_PAGE_SIZE) {
    return {
      valid: false,
      error: `Page size cannot exceed ${MAX_PAGE_SIZE}`,
    };
  }
  return { valid: true };
}

/** Throws `ValidationError` if the page size is invalid. */
export function assertPageSize(pageSize: number): void {
  const result = validatePageSize(pageSize);
  if (!result.valid) throw new ValidationError(result.error!, "pageSize");
}

// ── Date range ─────────────────────────────────────────────────────────────────

/**
 * Validate a date range for scan history filtering.
 * `from` must be before `to` and neither can be in the future.
 */
export function validateDateRange(
  from: Date,
  to: Date
): FieldValidation {
  const now = Date.now();
  if (from.getTime() > now) {
    return { valid: false, error: "Start date cannot be in the future" };
  }
  if (from >= to) {
    return { valid: false, error: "Start date must be before end date" };
  }
  return { valid: true };
}

/** Throws `ValidationError` if the date range is invalid. */
export function assertDateRange(from: Date, to: Date): void {
  const result = validateDateRange(from, to);
  if (!result.valid) throw new ValidationError(result.error!, "dateRange");
}
