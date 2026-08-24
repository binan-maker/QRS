// ── AuthContext ───────────────────────────────────────────────────────────────
// Thin provider that wires together the extracted auth hooks and exposes a
// stable context value to the component tree.
//
// Business logic lives in:
//   lib/auth/hooks/useFirebaseSession.ts — Firebase token listener
//   lib/auth/hooks/useGoogleAuth.ts     — Google sign-in (native + web)
//   lib/auth/hooks/useAuthActions.ts    — signIn / signUp / signOut / etc.
//   lib/auth/user-sync.ts               — Firebase user document sync
//   lib/auth/email-validation.ts        — server-side email validation
//
// For auth state outside React (API utils, background services) use:
//   import { useAuthStore } from "@/store/authStore";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type * as GoogleTypes from "expo-auth-session/providers/google";
import { useAuthStore } from "@/store/authStore";
import { useFirebaseSession } from "@/lib/auth/hooks/useFirebaseSession";
import { useGoogleAuth } from "@/lib/auth/hooks/useGoogleAuth";
import { useAuthActions } from "@/lib/auth/hooks/useAuthActions";
import { getAuthErrorMessage } from "@/lib/auth/utils";
import type { AuthUser } from "@/lib/auth/types";

export { getAuthErrorMessage };
export type { AuthUser };

// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, displayName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  switchGoogleAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
  updateLocalDisplayName: (name: string) => void;
  googleRequest: ReturnType<typeof GoogleTypes.useAuthRequest>[0];
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Shared flag: the Firebase session hook sets this when Firebase restores a
  // session; useGoogleAuth reads it to skip a redundant signInSilently call.
  const sessionRestoredRef = useRef(false);

  // ── Sync local state → Zustand store ──────────────────────────────────────
  // Components that need auth state outside React read from useAuthStore.
  // AuthContext local state remains the rendering source of truth.
  useEffect(() => {
    const store = useAuthStore.getState();
    store.setUser(user);
    store.setToken(token);
    store.setLoading(isLoading);
    store.setInitialized(!isLoading);
  }, [user, token, isLoading]);

  // ── Firebase session listener ──────────────────────────────────────────────
  useFirebaseSession({ setUser, setToken, setIsLoading, firebaseSessionRestoredRef: sessionRestoredRef });

  // ── Google sign-in ─────────────────────────────────────────────────────────
  const { googleRequest, signInWithGoogle, switchGoogleAccount } = useGoogleAuth({
    setUser,
    setToken,
    sessionRestoredRef,
  });

  // ── Auth actions ───────────────────────────────────────────────────────────
  const {
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    resendVerification,
    refreshUser,
    updateLocalDisplayName,
  } = useAuthActions({ user, setUser, setToken });

  // ── Context value ──────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      switchGoogleAccount,
      sendPasswordReset,
      resendVerification,
      refreshUser,
      updateLocalDisplayName,
      googleRequest,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token, isLoading, googleRequest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
