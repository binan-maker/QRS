/**
 * @infrastructure/auth — Firebase Auth provider implementation
 *
 * Implements IAuthProvider using Firebase Admin SDK.
 * Swappable in Phase 6 for Better Auth / Clerk without touching application layer.
 */

import { getAdminAuth } from "../../lib/firebase-admin";

// ─── Interfaces (unchanged — kept here so importers get both) ─────────────────

export interface VerifiedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export interface IAuthProvider {
  /** Verify an ID token and return the user claims. */
  verifyToken(token: string): Promise<VerifiedUser>;
  /** Create a session cookie (optional — for web session auth). */
  createSessionToken?(idToken: string, expiresInMs: number): Promise<string>;
  /** Revoke all sessions for a user (on sign-out or account delete). */
  revokeUserSessions(uid: string): Promise<void>;
}

// ─── FirebaseAuthProvider ─────────────────────────────────────────────────────

export class FirebaseAuthProvider implements IAuthProvider {
  async verifyToken(token: string): Promise<VerifiedUser> {
    const auth = getAdminAuth();
    if (!auth) {
      throw new Error(
        "Firebase Admin SDK not initialised — set FIREBASE_SERVICE_ACCOUNT_JSON",
      );
    }
    const decoded = await auth.verifyIdToken(token);
    return {
      uid:           decoded.uid,
      email:         decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name:          decoded.name,
      picture:       decoded.picture,
    };
  }

  async createSessionToken(idToken: string, expiresInMs: number): Promise<string> {
    const auth = getAdminAuth();
    if (!auth) throw new Error("Firebase Admin SDK not initialised");
    return auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  }

  async revokeUserSessions(uid: string): Promise<void> {
    const auth = getAdminAuth();
    if (!auth) return; // no-op when Admin SDK is unavailable
    await auth.revokeRefreshTokens(uid);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: FirebaseAuthProvider | null = null;

export function getAuthProvider(): FirebaseAuthProvider {
  if (!_instance) _instance = new FirebaseAuthProvider();
  return _instance;
}
