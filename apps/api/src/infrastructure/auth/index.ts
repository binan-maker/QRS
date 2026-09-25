import { deleteSupabaseUser, verifySupabaseToken, getAdminAuth } from "../../lib/supabase-admin";

export interface VerifiedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export interface IAuthProvider {
  verifyToken(token: string): Promise<VerifiedUser>;
  createSessionToken?(idToken: string, expiresInMs: number): Promise<string>;
  revokeUserSessions(uid: string): Promise<void>;
}

export class SupabaseAuthProvider implements IAuthProvider {
  async verifyToken(token: string): Promise<VerifiedUser> {
    const user = await verifySupabaseToken(token);
    if (!user) throw new Error("Supabase is not configured or the token is invalid");
    return {
      uid: user.uid,
      email: user.email ?? null,
      emailVerified: user.emailVerified,
      name: user.name,
      picture: user.picture,
    };
  }

  async createSessionToken(idToken: string, expiresInMs: number) {
    throw new Error("Session cookies are not supported; use the Supabase access token.");
  }

  async revokeUserSessions(uid: string) {
    const auth = getAdminAuth();
    if (auth) await auth.revokeRefreshTokens(uid);
  }
}

let instance: SupabaseAuthProvider | null = null;
export function getAuthProvider() {
  if (!instance) instance = new SupabaseAuthProvider();
  return instance;
}