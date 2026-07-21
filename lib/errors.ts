// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HIERARCHY — centralized typed errors for the entire application.
// ───────────────────────────────────────────────────────────────────────────────
// Usage:
//   import { AuthenticationError, ValidationError } from "@/lib/errors";
//   throw new AuthenticationError("Not logged in");
//
// Rules:
//   • Never throw a raw `new Error(...)` in business logic — use a typed error.
//   • Use `toAppError(e)` in catch blocks to normalize unknown errors.
//   • Add new error types here, not inline in service files.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Base ──────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  /** Machine-readable code, stable across releases. */
  readonly code: string;
  /** Optional structured context for debugging (never shown to users). */
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    // Maintains correct prototype chain when compiled to ES5.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/** User is not authenticated or credentials are invalid. */
export class AuthenticationError extends AppError {
  constructor(
    message = "Not authenticated",
    context?: Record<string, unknown>
  ) {
    super(message, "AUTH_ERROR", context);
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Input data failed validation. */
export class ValidationError extends AppError {
  /** The specific field that failed, if known. */
  readonly field?: string;

  constructor(
    message: string,
    field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, "VALIDATION_ERROR", context);
    this.field = field;
  }
}

// ── Authorization ─────────────────────────────────────────────────────────────

/** Authenticated user does not have permission to perform the action. */
export class PermissionError extends AppError {
  constructor(
    message = "Permission denied",
    context?: Record<string, unknown>
  ) {
    super(message, "PERMISSION_DENIED", context);
  }
}

// ── Network / API ─────────────────────────────────────────────────────────────

/** An HTTP or network-level error occurred. */
export class NetworkError extends AppError {
  /** HTTP status code, if applicable. */
  readonly statusCode?: number;

  constructor(
    message: string,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, "NETWORK_ERROR", context);
    this.statusCode = statusCode;
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────

/** A file storage operation failed. */
export class StorageError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "STORAGE_ERROR", context);
  }
}

// ── Database ──────────────────────────────────────────────────────────────────

/** A database read or write operation failed. */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", context);
  }
}

// ── Not Found ─────────────────────────────────────────────────────────────────

/** A document or resource was not found. */
export class NotFoundError extends AppError {
  constructor(
    message = "Resource not found",
    context?: Record<string, unknown>
  ) {
    super(message, "NOT_FOUND", context);
  }
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────

/** The caller has exceeded an operation rate limit. */
export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    context?: Record<string, unknown>
  ) {
    super(message, "RATE_LIMITED", context);
  }
}

// ── Unknown ───────────────────────────────────────────────────────────────────

/** Catch-all for errors that don't match any typed category. */
export class UnknownError extends AppError {
  /** The original error, preserved for debugging. */
  readonly originalError?: unknown;

  constructor(originalError?: unknown) {
    const msg =
      originalError instanceof Error
        ? originalError.message
        : "An unexpected error occurred";
    super(msg, "UNKNOWN_ERROR");
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Normalize any thrown value into a typed AppError.
 *
 * Use in catch blocks:
 *   catch (e) { throw toAppError(e); }
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new UnknownError(error);
  return new UnknownError(new Error(String(error)));
}

/**
 * Returns true when the error originates from a failed HTTP response.
 */
export function isNetworkError(e: unknown): e is NetworkError {
  return e instanceof NetworkError;
}

/**
 * Returns true when the user needs to log in to proceed.
 */
export function isAuthError(e: unknown): e is AuthenticationError {
  return e instanceof AuthenticationError;
}

/**
 * Extract a human-readable message from any error value,
 * suitable for display in UI error states.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}
