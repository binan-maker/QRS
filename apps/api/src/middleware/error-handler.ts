import type { Request, Response, NextFunction } from "express";

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

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      status: err.status,
    } satisfies ApiError);
    return;
  }

  const cast = err as { status?: number; statusCode?: number; message?: string };
  const status = cast.status ?? cast.statusCode ?? 500;

  console.error("[server] Unhandled error:", err);

  const message =
    status === 500 && process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : cast.message ?? "Internal Server Error";

  res.status(status).json({
    error: message,
    code: "INTERNAL_ERROR",
    status,
  } satisfies ApiError);
}
