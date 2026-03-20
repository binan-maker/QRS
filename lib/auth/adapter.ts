// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ADAPTER — provider-agnostic interface for all authentication operations.
// ───────────────────────────────────────────────────────────────────────────────
// To switch auth providers, edit ONE line in lib/auth/index.ts.
// No other files need changing — all auth consumers import from lib/auth.
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthAdapterUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  getIdToken(): Promise<string>;
  reload(): Promise<void>;
}

export interface AuthAdapter {
  onIdTokenChanged(cb: (user: AuthAdapterUser | null) => void): () => void;
  getCurrentUser(): AuthAdapterUser | null;
  signIn(email: string, password: string): Promise<AuthAdapterUser>;
  signUp(email: string, password: string): Promise<AuthAdapterUser>;
  signOut(): Promise<void>;
  signInWithGoogleToken(accessToken: string): Promise<AuthAdapterUser>;
  sendPasswordReset(email: string): Promise<void>;
  sendVerificationEmail(user: AuthAdapterUser): Promise<void>;
  updateDisplayName(user: AuthAdapterUser, displayName: string): Promise<void>;
  reauthenticate(user: AuthAdapterUser, email: string, password: string): Promise<void>;
  deleteUser(user: AuthAdapterUser): Promise<void>;
}
