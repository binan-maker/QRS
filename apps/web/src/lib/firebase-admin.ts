/**
 * Firebase Admin SDK — server-only.
 *
 * Used by Next.js API routes and Server Components for:
 * - Creating / verifying Firebase session cookies
 * - Admin operations that bypass Firestore security rules
 *
 * NEVER import this file in Client Components or pages marked "use client".
 */

import * as admin from "firebase-admin";
import { env } from "@/lib/env";

let _app: admin.app.App | null = null;

function initAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn(
      "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON not set — Admin SDK disabled",
    );
    return null;
  }

  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccountJson));
    return admin.initializeApp({ credential });
  } catch (err) {
    console.error("[firebase-admin] Failed to initialize:", err);
    return null;
  }
}

export function getAdminApp(): admin.app.App | null {
  if (!_app) _app = initAdminApp();
  return _app;
}

export function getAdminAuth(): admin.auth.Auth | null {
  const app = getAdminApp();
  return app ? admin.auth(app) : null;
}

/** Verify a Firebase session cookie and return the decoded token. */
export async function verifySessionCookie(
  cookie: string,
): Promise<admin.auth.DecodedIdToken | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifySessionCookie(cookie, true /* check revoked */);
  } catch {
    return null;
  }
}

/** Create a Firebase session cookie from a short-lived ID token. */
export async function createSessionCookie(
  idToken: string,
  /** Cookie duration in ms. Default: 5 days. */
  expiresInMs = 5 * 24 * 60 * 60 * 1000,
): Promise<string | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    return await auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  } catch (e: any) {
    console.error("[firebase-admin] createSessionCookie failed:", e.message);
    return null;
  }
}

/** Revoke all refresh tokens for a user (forces re-login everywhere). */
export async function revokeUserSessions(uid: string): Promise<void> {
  const auth = getAdminAuth();
  if (!auth) return;
  await auth.revokeRefreshTokens(uid);
}
