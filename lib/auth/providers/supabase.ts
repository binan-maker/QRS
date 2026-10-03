// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE AUTH PROVIDER — implements AuthAdapter using Supabase Auth.
// ───────────────────────────────────────────────────────────────────────────────
// This is the ONLY file that imports the Supabase Auth SDK for mobile/web auth.
// All other files use the adapter interface from lib/auth.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "../../supabase";
import type { AuthAdapter, AuthAdapterUser } from "../adapter";
import type { User } from "@supabase/supabase-js";

// ─── User wrapper ──────────────────────────────────────────────────────────────

let currentSession: { user: User; access_token: string } | null = null;

function wrapUser(user: User, accessToken: string): AuthAdapterUser {
  const meta = user.user_metadata ?? {};
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName:
      meta.full_name ?? meta.name ?? meta.display_name ?? user.email?.split("@")[0] ?? null,
    photoURL: meta.avatar_url ?? meta.picture ?? null,
    get emailVerified() {
      return !!user.email_confirmed_at;
    },
    getIdToken: async (_forceRefresh?: boolean) => {
      if (_forceRefresh) {
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          accessToken = data.session.access_token;
          currentSession = { user: data.session.user, access_token: data.session.access_token };
        }
        return data.session?.access_token ?? accessToken;
      }
      return accessToken;
    },
    reload: async () => {
      // 1. Fetch fresh user directly from Supabase server to get latest email_confirmed_at
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData?.session?.access_token) {
          accessToken = sessData.session.access_token;
        }
        currentSession = { user: userData.user, access_token: accessToken };
      } else {
        const { data: sessData } = await supabase.auth.refreshSession();
        if (sessData?.session?.user && sessData.session.access_token) {
          user = sessData.session.user;
          accessToken = sessData.session.access_token;
          currentSession = { user: sessData.session.user, access_token: sessData.session.access_token };
        }
      }
    },
  };
}

// ─── Get current access token ─────────────────────────────────────────────────

async function getCurrentToken(): Promise<string> {
  if (currentSession?.access_token) return currentSession.access_token;
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentSession = { user: data.session.user, access_token: data.session.access_token };
  }
  return data.session?.access_token ?? "";
}

// ─── Auth Provider ────────────────────────────────────────────────────────────

export const supabaseAuthProvider: AuthAdapter = {
  onIdTokenChanged(cb) {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && session.access_token) {
        currentSession = { user: session.user, access_token: session.access_token };
        cb(wrapUser(session.user, session.access_token));
      } else {
        currentSession = null;
        cb(null);
      }
    });
    return () => data.subscription.unsubscribe();
  },

  getCurrentUser() {
    if (currentSession?.user && currentSession.access_token) {
      return wrapUser(currentSession.user, currentSession.access_token);
    }
    return null;
  },

  async refreshCurrentUser() {
    const { data: sessData } = await supabase.auth.getSession();
    if (sessData?.session?.access_token) {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user || sessData.session.user;
      currentSession = { user: u, access_token: sessData.session.access_token };
      return wrapUser(u, sessData.session.access_token);
    }
    return null;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("Sign-in failed — no session returned");
    currentSession = { user: data.user, access_token: data.session.access_token };
    return wrapUser(data.user, data.session.access_token);
  },

  async signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: displayName
        ? {
            data: {
              full_name: displayName,
              display_name: displayName,
              name: displayName,
            },
          }
        : undefined,
    });
    if (error) throw error;
    if (!data.user) throw new Error("Sign-up failed — no user returned");
    // After signUp, a session may already exist (or pending email confirmation).
    const token = data.session?.access_token ?? "";
    if (data.session) {
      currentSession = { user: data.user, access_token: token };
    }
    return wrapUser(data.user, token);
  },

  async signOut() {
    currentSession = null;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async signInWithGoogleToken(accessToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: accessToken,
    });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("Google sign-in failed");
    return wrapUser(data.user, data.session.access_token);
  },

  async signInWithGoogleIdToken(idToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("Google sign-in failed");
    return wrapUser(data.user, data.session.access_token);
  },

  async sendPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async sendVerificationEmail(_user) {
    // Supabase sends a confirmation email on sign-up automatically.
    // To resend: call resend with OTP type=signup.
    if (!_user.email) return;
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: _user.email });
      if (error) {
        console.warn("[supabaseAuthProvider] resend verification email:", error.message);
      }
    } catch (err: any) {
      console.warn("[supabaseAuthProvider] resend error:", err?.message);
    }
  },

  async updateDisplayName(_user, displayName) {
    // Only call updateUser if there is an active session
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName, display_name: displayName, name: displayName },
      });
      if (error) {
        if (
          error.message?.toLowerCase().includes("session") ||
          (error as any).name === "AuthSessionMissingError"
        ) {
          return;
        }
        throw error;
      }
    } catch (err: any) {
      if (
        err?.message?.toLowerCase().includes("session") ||
        err?.name === "AuthSessionMissingError"
      ) {
        return;
      }
      throw err;
    }
  },

  async reauthenticate(user, email, password) {
    // Supabase doesn't have a reauthenticate() — re-sign-in is the equivalent.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async deleteUser(_user) {
    // Client-side user deletion requires a server-side admin call.
    // We call our own API endpoint which uses the Supabase service role key.
    const token = await getCurrentToken();
    const res = await fetch("/api/v1/account/delete", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Account deletion failed");
    }
  },

  async checkEmailExists(email: string): Promise<boolean> {
    // Supabase doesn't expose fetchSignInMethodsForEmail.
    // Use our own API endpoint for this check.
    try {
      const res = await fetch("/api/v1/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      return body?.exists === true;
    } catch {
      return false;
    }
  },

  getProviderIds(): string[] {
    const session = (supabase.auth as any)._session as { user?: User } | null;
    return session?.user?.identities?.map((i: any) => i.provider) ?? [];
  },
};
