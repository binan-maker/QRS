"use client";

/**
 * Firebase Auth context for the BinRo web app.
 *
 * Provides:
 *   - useAuth() hook for current user state
 *   - signIn / signOut helpers that also manage the server session cookie
 *   - Loading state to avoid flash of unauthenticated content
 *
 * Session cookie flow:
 *   signIn → Firebase Auth → getIdToken() → POST /api/auth/session → cookie set
 *   signOut → DELETE /api/auth/session → Firebase signOut()
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import { createSession, destroySession } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Current Firebase user. null = signed out. undefined = loading. */
  user: User | null | undefined;
  /** True while auth state is being resolved on mount. */
  loading: boolean;
  /** Sign in with email + password and create a server session. */
  signInWithEmail: (email: string, password: string) => Promise<UserCredential>;
  /** Register with email + password and create a server session. */
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  /** Sign in with Google popup and create a server session. */
  signInWithGoogle: () => Promise<UserCredential>;
  /** Send a password-reset email. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sign out from both Firebase and the server session. */
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  // Track in-flight session creation to avoid duplicate POSTs
  const sessionPending = useRef(false);

  /** After any successful sign-in, exchange ID token for a server session cookie. */
  const afterSignIn = useCallback(async (credential: UserCredential): Promise<UserCredential> => {
    if (!sessionPending.current) {
      sessionPending.current = true;
      try {
        const token = await credential.user.getIdToken();
        await createSession(token);
      } finally {
        sessionPending.current = false;
      }
    }
    return credential;
  }, []);

  // ── Auth state listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Firebase not configured (dev without keys) — treat as signed out
      setUser(null);
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Auth methods ─────────────────────────────────────────────────────────────

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase Auth is not configured");
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return afterSignIn(cred);
    },
    [afterSignIn],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase Auth is not configured");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      return afterSignIn(cred);
    },
    [afterSignIn],
  );

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not configured");
    const provider = getGoogleProvider();
    const cred = await signInWithPopup(auth, provider);
    return afterSignIn(cred);
  }, [afterSignIn]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not configured");
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOut = useCallback(async () => {
    await destroySession(); // clear server session cookie first
    const auth = getFirebaseAuth();
    if (auth) await fbSignOut(auth);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used inside <AuthProvider>");
  }
  return ctx;
}
