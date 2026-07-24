"use client";

/**
 * Supabase Auth context for the BinRo web app.
 *
 * Replaces the Firebase Auth context.
 *
 * Provides:
 *   - useAuth() hook for current user state
 *   - signIn / signOut helpers that also manage the server session cookie
 *   - Loading state to avoid flash of unauthenticated content
 *
 * Session cookie flow:
 *   signIn → Supabase Auth → session.access_token → POST /api/auth/session → cookie set
 *   signOut → DELETE /api/auth/session → Supabase signOut()
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
import type { User, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { createSession, destroySession } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Current Supabase user. null = signed out. undefined = loading. */
  user: User | null | undefined;
  /** True while auth state is being resolved on mount. */
  loading: boolean;
  /** Sign in with email + password and create a server session. */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Register with email + password and create a server session. */
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  /** Sign in with Google popup and create a server session. */
  signInWithGoogle: () => Promise<void>;
  /** Send a password-reset email. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sign out from both Supabase and the server session. */
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

  /** After any successful sign-in, exchange access token for a server session cookie. */
  const afterSignIn = useCallback(async (session: Session): Promise<void> => {
    if (!sessionPending.current) {
      sessionPending.current = true;
      try {
        await createSession(session.access_token);
      } finally {
        sessionPending.current = false;
      }
    }
  }, []);

  // ── Auth state listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient();

    // Check existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth methods ─────────────────────────────────────────────────────────────

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) await afterSignIn(data.session);
    },
    [afterSignIn],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: displayName
          ? { data: { full_name: displayName, display_name: displayName } }
          : undefined,
      });
      if (error) throw error;
      if (data.session) await afterSignIn(data.session);
    },
    [afterSignIn],
  );

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    // OAuth redirects — session is picked up by onAuthStateChange on return.
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await destroySession(); // clear server session cookie first
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
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
