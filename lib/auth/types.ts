// ── Auth domain types ─────────────────────────────────────────────────────────
// AuthUser is the app's canonical user shape — distinct from Firebase's User
// object. It is used by the auth store, auth context, and all consumers.
// Source of truth for everything that calls useAuth() or useAuthStore().

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  emailVerified: boolean;
  username?: string;
}
