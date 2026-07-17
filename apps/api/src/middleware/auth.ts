/**
 * Firebase Authentication middleware.
 *
 * authenticate     — required; attaches req.user or returns 401
 * optionalAuth     — optional; attaches req.user if valid token present, otherwise continues
 *
 * Keeping Firebase Auth as the identity layer while centralising token
 * verification in one place instead of copy-pasted in every route handler.
 */

import type { Request, Response, NextFunction } from "express";
import { getAdminAuth } from "../lib/firebase-admin";

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

function isAuthError(code: string): boolean {
  return (
    code === "auth/argument-error" ||
    code === "auth/id-token-expired" ||
    code === "auth/id-token-revoked" ||
    code === "auth/invalid-id-token"
  );
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

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    res.status(503).json({
      error: "Authentication service unavailable — FIREBASE_SERVICE_ACCOUNT_JSON not set",
      code: "SERVICE_UNAVAILABLE",
      status: 503,
    });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified ?? false,
    };
    next();
  } catch (e: any) {
    if (isAuthError(e.code)) {
      res.status(401).json({
        error: "Invalid or expired token",
        code: "TOKEN_INVALID",
        status: 401,
      });
      return;
    }
    console.error("[auth] verifyIdToken error:", e.message ?? e);
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

  const adminAuth = getAdminAuth();
  if (!adminAuth) return next();

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified ?? false,
    };
  } catch {
    // silently ignore — request continues as unauthenticated
  }
  next();
}
