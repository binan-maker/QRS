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

function isCustomUploadedUrl(url?: unknown): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (
    trimmed.includes("googleusercontent.com") ||
    trimmed.includes("google.com") ||
    trimmed.includes("gstatic.com") ||
    trimmed.includes("placeholder") ||
    trimmed.includes("default-avatar") ||
    trimmed.includes("ui-avatars.com")
  ) {
    return false;
  }
  return true;
}

function wrapUser(user: User, accessToken: string): AuthAdapterUser {
  const meta = user.user_metadata ?? {};
  const customPhoto =
    (isCustomUploadedUrl(meta.custom_avatar_url) ? meta.custom_avatar_url : null) ??
    (isCustomUploadedUrl(meta.photo_url) ? meta.photo_url : null) ??
    (isCustomUploadedUrl(meta.avatar_url) ? meta.avatar_url : null) ??
    (isCustomUploadedUrl(meta.photoURL) ? meta.photoURL : null);
  const resolvedPhoto =
    customPhoto ??
    meta.custom_avatar_url ??
    meta.photo_url ??
    meta.avatar_url ??
    meta.picture ??
    meta.photoURL ??
    null;

  return {
    uid: user.id,
    email: user.email ?? null,
    displayName:
      meta.display_name ?? meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? null,
    photoURL: resolvedPhoto,
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
        if (
          session.user.user_metadata?.is_deleted === true ||
          session.user.user_metadata?.account_deleted === true
        ) {
          currentSession = null;
          await supabase.auth.signOut().catch(() => {});
          cb(null);
          return;
        }
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
      if (u?.user_metadata?.is_deleted === true || u?.user_metadata?.account_deleted === true) {
        currentSession = null;
        await supabase.auth.signOut().catch(() => {});
        return null;
      }
      currentSession = { user: u, access_token: sessData.session.access_token };
      return wrapUser(u, sessData.session.access_token);
    }
    return null;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user || !data.session) throw new Error("Sign-in failed — no session returned");
    if (
      data.user.user_metadata?.is_deleted === true ||
      data.user.user_metadata?.account_deleted === true
    ) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error("This account has been permanently deleted.");
    }
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
    const token = await getCurrentToken();
    if (!token) {
      const err: any = new Error("Session expired. Please sign in again to delete your account.");
      err.code = "auth/requires-recent-login";
      throw err;
    }

    let deleted = false;

    // 1. Try calling the unified Web API endpoint (/api/account/delete) if reachable
    if (typeof fetch === "function") {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const candidateUrls = domain
        ? [`https://${domain.split(":")[0]}/api/account/delete`, "/api/account/delete"]
        : ["/api/account/delete"];

      for (const endpoint of candidateUrls) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const body = await res.json().catch(() => ({}));
            if (body?.authDeleted === true) {
              deleted = true;
              break;
            }
          }
        } catch {
          // On native mobile or offline relative URL, fall through to direct Supabase RPC
        }
      }
    }

    // 2. Call the SECURITY DEFINER RPC on Supabase directly (works on both Mobile and Web)
    if (!deleted) {
      for (const rpcName of ["delete_own_account", "delete_user", "delete_user_account"]) {
        try {
          const { error: rpcErr } = await supabase.rpc(rpcName);
          if (!rpcErr) {
            deleted = true;
            break;
          }
        } catch {}
      }
    }

    // 3. Fallback tombstone on auth.users metadata so the account is permanently locked
    if (!deleted) {
      try {
        const now = new Date().toISOString();
        const tombstonePassword = `Del!${Math.random().toString(36).slice(2)}_${Date.now()}Aa1!`;
        await supabase.auth.updateUser({
          password: tombstonePassword,
          data: {
            is_deleted: true,
            account_deleted: true,
            deleted_at: now,
            display_name: "Deleted User",
            full_name: "Deleted User",
            name: "Deleted User",
            username: null,
            user_name: null,
            past_usernames: [],
            avatar_url: null,
            photo_url: null,
            custom_avatar_url: null,
          },
        });
      } catch {}
    }

    currentSession = null;
    await supabase.auth.signOut({ scope: "global" }).catch(() => {});
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) return false;

    // 1. Try the Web API route (/api/auth/check-email)
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.exists === true) return true;
      }
    } catch {}

    // 2. Direct Supabase query on public.users (works on Mobile native & Web)
    try {
      const { data: userInDb } = await supabase
        .from("users")
        .select("id")
        .ilike("email", normalizedEmail)
        .eq("is_deleted", false)
        .maybeSingle();
      return Boolean(userInDb);
    } catch {
      return false;
    }
  },

  getProviderIds(): string[] {
    const session = (supabase.auth as any)._session as { user?: User } | null;
    return session?.user?.identities?.map((i: any) => i.provider) ?? [];
  },
};
