import type { Request, Response, NextFunction } from "express";
import { DomainError } from "@binro/core";

export interface ApiError {
  error: string;
  code: string;
  status: number;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Domain error → HTTP status mapping ───────────────────────────────────────
// Keeps HTTP concerns out of the domain layer.

const DOMAIN_ERROR_STATUS: Record<string, number> = {
  QR_NOT_FOUND:            404,
  USER_NOT_FOUND:          404,
  FORBIDDEN:               403,
  AUTH_REQUIRED:           401,
  VALIDATION_ERROR:        400,
  QR_INACTIVE:             410,
  SCAN_LIMIT_EXCEEDED:     410,
  QR_EXPIRED:              410,
  DUPLICATE_SCAN:          409,
  GOVERNMENT_QR_IMMUTABLE: 422,
  USERNAME_TAKEN:          409,
  SELF_FOLLOW:             422,
  ALREADY_FRIENDS:         409,
  REQUEST_PENDING:         409,
  SERVICE_UNAVAILABLE:     503,
  RATE_LIMITED:            429,
};

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    return next(err);
  }

  // ── Domain errors (typed, known) ──────────────────────────────────────────
  if (err instanceof DomainError) {
    const status = DOMAIN_ERROR_STATUS[err.code] ?? 400;
    res.status(status).json({
      error:  err.message,
      code:   err.code,
      status,
    } satisfies ApiError);
    return;
  }

  // ── Application errors (HTTP status already set) ──────────────────────────
  if (err instanceof AppError) {
    res.status(err.status).json({
      error:  err.message,
      code:   err.code,
      status: err.status,
    } satisfies ApiError);
    return;
  }

  // ── Unknown / unexpected errors ───────────────────────────────────────────
  const cast = err as { status?: number; statusCode?: number; message?: string };
  const status = cast.status ?? cast.statusCode ?? 500;

  if (status >= 500) {
    console.error("[server] Unhandled error:", err);
  }

  const message =
    status === 500 && process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : (cast.message ?? "Internal Server Error");

  res.status(status).json({
    error:  message,
    code:   "INTERNAL_ERROR",
    status,
  } satisfies ApiError);
}
