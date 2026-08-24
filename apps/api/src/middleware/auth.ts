/**
 * Firebase Authentication middleware.
 *
 * authenticate     — required; attaches req.user or returns 401
 * optionalAuth     — optional; attaches req.user if valid token present, otherwise continues
 */

import type { Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../lib/firebase-admin";

// ─── Augment Express Request ─────────────────────────────────────────────────

export interface AuthUser {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// ─── Required authentication ─────────────────────────────────────────────────

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      error: "Authorization header with Bearer token required",
      code: "AUTH_REQUIRED",
      status: 401,
    });
    return;
  }

  try {
    const user = await verifyFirebaseToken(token);
    if (!user) {
      res.status(401).json({
        error: "Invalid or expired token",
        code: "TOKEN_INVALID",
        status: 401,
      });
      return;
    }
    req.user = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.email_verified ?? false,
    };
    next();
  } catch (e: any) {
    const isAuthErr =
      e?.message?.includes("expired") ||
      e?.message?.includes("invalid") ||
      e?.code?.startsWith("auth/");
    if (isAuthErr) {
      res.status(401).json({
        error: "Invalid or expired token",
        code: "TOKEN_INVALID",
        status: 401,
      });
      return;
    }
    console.error("[auth] verifyFirebaseToken error:", e.message ?? e);
    res.status(401).json({
      error: "Authentication failed",
      code: "AUTH_FAILED",
      status: 401,
    });
  }
}

// ─── Optional authentication ──────────────────────────────────────────────────

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const user = await verifyFirebaseToken(token);
    if (user) req.user = {
      uid: user.uid,
      email: user.email,
      emailVerified: user.email_verified ?? false,
    };
  } catch {
    // silently ignore — request continues as unauthenticated
  }
  next();
}
