/**
 * @infrastructure/auth — Auth provider adapter
 *
 * Satisfies the IAuthProvider interface.
 * Currently wraps Firebase Admin SDK — swappable in Phase 6 for Better Auth / Clerk.
 *
 * The application layer never imports firebase-admin directly;
 * it receives an IAuthProvider implementation via dependency injection.
 */

export interface VerifiedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export interface IAuthProvider {
  /** Verify an ID token (Firebase, JWT, etc.) and return the user claims. */
  verifyToken(token: string): Promise<VerifiedUser>;
  /** Create a session token (for web session cookie auth). */
  createSessionToken?(idToken: string, expiresInMs: number): Promise<string>;
  /** Revoke all sessions for a user (on sign-out or account delete). */
  revokeUserSessions(uid: string): Promise<void>;
}

// Placeholder — FirebaseAuthProvider implemented in Phase 3.
export {};
