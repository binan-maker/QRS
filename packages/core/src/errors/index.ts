/**
 * @binro/core — Domain Error Types
 *
 * Typed error hierarchy for the BinRo domain.
 * These errors are framework-agnostic — they do not reference HTTP status codes.
 * The interface layer (Express routes) maps these to HTTP responses.
 *
 * Usage:
 *   throw new QrNotFoundError(qrId);
 *   // → HTTP 404 in Express handler
 *   // → Alert dialog in mobile app
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ─── Not Found ────────────────────────────────────────────────────────────────

export class QrNotFoundError extends DomainError {
  readonly code = "QR_NOT_FOUND";
  constructor(public readonly qrId: string) {
    super(`QR code not found: ${qrId}`);
  }
}

export class UserNotFoundError extends DomainError {
  readonly code = "USER_NOT_FOUND";
  constructor(public readonly userId: string) {
    super(`User not found: ${userId}`);
  }
}

// ─── Authorisation ────────────────────────────────────────────────────────────

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  constructor(message = "You do not have permission to perform this action") {
    super(message);
  }
}

export class AuthRequiredError extends DomainError {
  readonly code = "AUTH_REQUIRED";
  constructor() {
    super("Authentication is required");
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

// ─── Business Rule Violations ─────────────────────────────────────────────────

export class QrInactiveError extends DomainError {
  readonly code = "QR_INACTIVE";
  constructor(
    public readonly qrId: string,
    public readonly message: string = "This QR code is currently inactive",
  ) {
    super(message);
  }
}

export class ScanLimitExceededError extends DomainError {
  readonly code = "SCAN_LIMIT_EXCEEDED";
  constructor(public readonly qrId: string) {
    super(`Scan limit exceeded for QR: ${qrId}`);
  }
}

export class QrExpiredError extends DomainError {
  readonly code = "QR_EXPIRED";
  constructor(public readonly qrId: string) {
    super(`QR code has expired: ${qrId}`);
  }
}

export class DuplicateScanError extends DomainError {
  readonly code = "DUPLICATE_SCAN";
  constructor() {
    super("This QR has already been scanned recently");
  }
}

export class GovernmentQrImmutableError extends DomainError {
  readonly code = "GOVERNMENT_QR_IMMUTABLE";
  constructor() {
    super("Government QR codes cannot be modified");
  }
}

export class UsernameTakenError extends DomainError {
  readonly code = "USERNAME_TAKEN";
  constructor(public readonly username: string) {
    super(`Username already taken: ${username}`);
  }
}

export class SelfFollowError extends DomainError {
  readonly code = "SELF_FOLLOW";
  constructor() {
    super("You cannot follow yourself");
  }
}

export class AlreadyFriendsError extends DomainError {
  readonly code = "ALREADY_FRIENDS";
  constructor() {
    super("You are already friends with this user");
  }
}

export class RequestPendingError extends DomainError {
  readonly code = "REQUEST_PENDING";
  constructor() {
    super("A friend request is already pending");
  }
}

// ─── Infrastructure ───────────────────────────────────────────────────────────

export class ServiceUnavailableError extends DomainError {
  readonly code = "SERVICE_UNAVAILABLE";
  constructor(public readonly service: string) {
    super(`Service unavailable: ${service}`);
  }
}

export class RateLimitedError extends DomainError {
  readonly code = "RATE_LIMITED";
  constructor(public readonly retryAfterMs?: number) {
    super("Too many requests — please slow down");
  }
}
