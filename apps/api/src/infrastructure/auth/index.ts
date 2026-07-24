/**
 * @infrastructure/auth — Supabase Auth provider implementation
 *
 * Implements IAuthProvider using Supabase Admin SDK.
 * Swappable without touching the application layer.
 */

import { verifySupabaseToken, getAdminSupabase } from "../../lib/supabase-admin";

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
  /** Create a session token (for web session auth). */
  createSessionToken?(idToken: string, expiresInMs: number): Promise<string>;
  /** Revoke all sessions for a user (on sign-out or account delete). */
  revokeUserSessions(uid: string): Promise<void>;
}

// ─── SupabaseAuthProvider ─────────────────────────────────────────────────────

export class SupabaseAuthProvider implements IAuthProvider {
  async verifyToken(token: string): Promise<VerifiedUser> {
    const user = await verifySupabaseToken(token);
    if (!user) {
      throw new Error("Supabase Admin not initialised or token invalid — set SUPABASE_SERVICE_ROLE_KEY");
    }
    return {
      uid:           user.uid,
      email:         user.email ?? null,
      emailVerified: user.emailVerified,
    };
  }

  async createSessionToken(idToken: string, _expiresInMs: number): Promise<string> {
    // Supabase uses JWTs natively — return the access token as-is.
    return idToken;
  }

  async revokeUserSessions(uid: string): Promise<void> {
    const supabase = getAdminSupabase();
    if (!supabase) return;
    await supabase.auth.admin.signOut(uid);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: SupabaseAuthProvider | null = null;

export function getAuthProvider(): SupabaseAuthProvider {
  if (!_instance) _instance = new SupabaseAuthProvider();
  return _instance;
}

// Legacy alias kept for backwards compatibility
export const FirebaseAuthProvider = SupabaseAuthProvider;
