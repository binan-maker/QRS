// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE AUTH PROVIDER — implements AuthAdapter using Supabase Auth.
// ───────────────────────────────────────────────────────────────────────────────
// This is the ONLY file that imports the Supabase Auth SDK for mobile/web auth.
// All other files use the adapter interface from lib/auth.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import type { AuthAdapter, AuthAdapterUser } from "../adapter";
import type { User } from "@supabase/supabase-js";

// ─── User wrapper ──────────────────────────────────────────────────────────────

function wrapUser(user: User, accessToken: string): AuthAdapterUser {
  const meta = user.user_metadata ?? {};
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName:
      meta.full_name ?? meta.name ?? meta.display_name ?? user.email?.split("@")[0] ?? null,
    photoURL: meta.avatar_url ?? meta.picture ?? null,
    emailVerified: !!user.email_confirmed_at,
    getIdToken: async (_forceRefresh?: boolean) => {
      if (_forceRefresh) {
        const { data } = await supabase.auth.refreshSession();
        return data.session?.access_token ?? accessToken;
      }
      return accessToken;
    },
    reload: async () => {
      await supabase.auth.refreshSession();
    },
  };
}

// ─── Get current access token ─────────────────────────────────────────────────

async function getCurrentToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

// ─── Auth Provider ────────────────────────────────────────────────────────────

export const supabaseAuthProvider: AuthAdapter = {
  onIdTokenChanged(cb) {
    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && session.access_token) {
        cb(wrapUser(session.user, session.access_token));
      } else {
        cb(null);
      }
    });
    return () => data.subscription.unsubscribe();
  },

  getCurrentUser() {
    // Supabase getUser() is async; we use the cached session for the sync call.
    // The session is kept up to date by onAuthStateChange.
    const session = (supabase.auth as any)._session as { user?: User; access_token?: string } | null;
    if (session?.user && session.access_token) {
      return wrapUser(session.user, session.access_token);
    }
    return null;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("Sign-in failed — no session returned");
    return wrapUser(data.user, data.session.access_token);
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Sign-up failed — no user returned");
    // After signUp, a session may already exist (if email confirmation is disabled).
    const token = data.session?.access_token ?? "";
    return wrapUser(data.user, token);
  },

  async signOut() {
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
    const { error } = await supabase.auth.resend({ type: "signup", email: _user.email ?? "" });
    if (error) throw error;
  },

  async updateDisplayName(_user, displayName) {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName, display_name: displayName },
    });
    if (error) throw error;
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
