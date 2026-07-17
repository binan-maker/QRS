/**
 * Per-endpoint rate-limit middleware factory.
 *
 * Uses the existing checkRateLimit / getClientIp utilities (Redis + in-memory fallback).
 * For authenticated endpoints, limiting is per-UID so VPN/NAT rotation is less effective.
 *
 * Tiers:
 *   strict   —  10 req / 60 s  — write operations, report submission
 *   standard —  30 req / 60 s  — general authenticated mutations
 *   relaxed  —  60 req / 60 s  — read-heavy authenticated endpoints
 *   public   —  20 req / 60 s  — unauthenticated endpoints (per IP)
 *
 * Future: replace with proper token-bucket middleware (e.g. express-rate-limit + ioredis)
 * for distributed deployments.
 */

import type { Request, Response, NextFunction } from "express";
import { checkRateLimit, getClientIp } from "./rate-limiter";

export interface RateLimitConfig {
  max: number;
  windowMs: number;
  /** Key prefix to namespace limits across endpoints */
  prefix?: string;
}

function buildLimiter(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Use UID for authenticated requests to resist IP rotation
    const uid = (req as any).user?.uid;
    const ip = getClientIp(req);
    const key = uid ? `uid:${uid}` : `ip:${ip}`;
    const namespacedKey = config.prefix ? `${config.prefix}:${key}` : key;

    const allowed = await checkRateLimit(namespacedKey, config.max, config.windowMs);
    if (!allowed) {
      res.status(429).json({
        error: "Too many requests — please slow down",
        code: "RATE_LIMITED",
        status: 429,
        retryAfterMs: config.windowMs,
      });
      return;
    }
    next();
  };
}

// ─── Named presets ────────────────────────────────────────────────────────────

/** 10 req / 60 s — sensitive writes (reports, auth-adjacent actions) */
export const strictLimit = buildLimiter({
  max: 10,
  windowMs: 60_000,
  prefix: "strict",
});

/** 30 req / 60 s — general authenticated mutations */
export const standardLimit = buildLimiter({
  max: 30,
  windowMs: 60_000,
  prefix: "std",
});

/** 60 req / 60 s — read-heavy authenticated endpoints */
export const relaxedLimit = buildLimiter({
  max: 60,
  windowMs: 60_000,
  prefix: "relax",
});

/** 20 req / 60 s — public unauthenticated endpoints (per IP) */
export const publicLimit = buildLimiter({
  max: 20,
  windowMs: 60_000,
  prefix: "pub",
});

/** Factory for one-off custom configs */
export function customLimit(config: RateLimitConfig) {
  return buildLimiter(config);
}
