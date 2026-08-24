import { deleteFirebaseUser, verifyFirebaseToken, getAdminAuth } from "../../lib/firebase-admin";

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

export class FirebaseAuthProvider implements IAuthProvider {
  async verifyToken(token: string): Promise<VerifiedUser> {
    const user = await verifyFirebaseToken(token);
    if (!user) throw new Error("Firebase Admin is not configured or the token is invalid");
    return {
      uid: user.uid,
      email: user.email ?? null,
      emailVerified: user.email_verified ?? false,
      name: user.name,
      picture: user.picture,
    };
  }

  async createSessionToken(idToken: string, expiresInMs: number) {
    const auth = getAdminAuth();
    if (!auth) throw new Error("Firebase Admin is not configured");
    return auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  }

  async revokeUserSessions(uid: string) {
    const auth = getAdminAuth();
    if (auth) await auth.revokeRefreshTokens(uid);
  }
}

let instance: FirebaseAuthProvider | null = null;
export function getAuthProvider() {
  if (!instance) instance = new FirebaseAuthProvider();
  return instance;
}