// ── Auth actions hook ─────────────────────────────────────────────────────────
// All state-mutating auth operations: sign-in, sign-up, sign-out, password
// reset, email verification, profile refresh, and local display-name update.
// Extracted from AuthContext so the provider stays a thin wiring layer.

import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Platform } from "react-native";
import { authAdapter } from "@/lib/auth";
import { syncUserToDb } from "@/lib/auth/user-sync";
import { serverValidateEmail } from "@/lib/auth/email-validation";
import { mapAuthError, getAuthErrorMessage, buildAuthUser } from "@/lib/auth/utils";
import { trackLoginCompleted } from "@/lib/core/analytics";
import { db } from "@/lib/db";
import { COLLECTIONS } from "@/shared/constants/collections";
import { queryClient } from "@/lib/core/query-client";
import { clearAppSessionData } from "@/services/cache";
import { cacheAuthUser, clearCachedAuthUser } from "@/lib/auth/session-cache";
import type { AuthUser } from "@/lib/auth/types";

// GoogleSignin is loaded lazily — configure() is handled by useGoogleAuth;
// only signOut() is needed here.
let GoogleSignin: any = null;
if (Platform.OS !== "web") {
  try {
    GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

interface Params {
  user: AuthUser | null;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  setToken: Dispatch<SetStateAction<string | null>>;
}

export function useAuthActions({ user, setUser, setToken }: Params) {
  // Prevents duplicate concurrent sign-out calls (e.g. navigation effect firing
  // just after a manual sign-out).
  const isSigningOutRef = useRef(false);

  // ── signIn ──────────────────────────────────────────────────────────────────

  async function signIn(email: string, pass: string) {
    try {
      const adapterUser = await authAdapter.signIn(email, pass);
      const synced = await syncUserToDb(
        adapterUser.uid,
        adapterUser.email,
        adapterUser.displayName,
        adapterUser.photoURL,
        undefined,
        adapterUser.emailVerified,
      );
      const idToken = await adapterUser.getIdToken();
      const authUser = buildAuthUser(adapterUser, synced);
      setUser(authUser);
      setToken(idToken);
      cacheAuthUser(authUser);
      trackLoginCompleted("email");
    } catch (e: any) {
      if (
        e.code === "auth/email-not-verified" ||
        e.code === "email_not_confirmed" ||
        e.message?.toLowerCase().includes("email not confirmed")
      ) {
        const err = new Error(getAuthErrorMessage("auth/email-not-verified")) as any;
        err.code = "auth/email-not-verified";
        throw err;
      }
      throw mapAuthError(e);
    }
  }

  // ── signUp ──────────────────────────────────────────────────────────────────

  async function signUp(email: string, displayName: string, password: string) {
    try {
      const emailValidation = await serverValidateEmail(email);
      if (!emailValidation.valid) {
        const err = new Error(
          emailValidation.error || "Please use a real email address.",
        ) as any;
        err.code = "auth/invalid-email-domain";
        throw err;
      }
      const adapterUser = await authAdapter.signUp(email, password, displayName);
      
      // If user requires email verification:
      // Supabase already sends the confirmation email on sign-up automatically.
      if (!adapterUser.emailVerified) {
        // Pre-create user profile and apply referral code in Supabase
        syncUserToDb(
          adapterUser.uid,
          adapterUser.email,
          displayName || adapterUser.displayName,
          adapterUser.photoURL,
          undefined,
          false,
        ).catch(() => {});

        // Keep the unverified session so refreshUser() can detect confirmation when user taps "I've verified my email"
        const err = new Error("VERIFICATION_SENT") as any;
        err.code = "auth/verification-sent";
        throw err;
      }

      // If email verification is disabled in Supabase and user is immediately active:
      await syncUserToDb(
        adapterUser.uid,
        adapterUser.email,
        displayName || adapterUser.displayName,
        adapterUser.photoURL,
        undefined,
        adapterUser.emailVerified,
      );
      const idToken = await adapterUser.getIdToken();
      const authUser = buildAuthUser(adapterUser, { displayName });
      setUser(authUser);
      setToken(idToken);
      cacheAuthUser(authUser);
      trackLoginCompleted("email");
    } catch (e: any) {
      if (e.code === "auth/verification-sent") throw e;
      if (e.code === "auth/invalid-email-domain") throw e;
      throw mapAuthError(e);
    }
  }

  // ── signOut ─────────────────────────────────────────────────────────────────

  async function signOut() {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    const signedOutUserId = user?.id ?? null;

    // Clear auth state immediately — UI responds at once, no visible delay.
    setUser(null);
    setToken(null);
    clearCachedAuthUser();
    queryClient.clear();
    clearAppSessionData(signedOutUserId);

    // Provider sign-out must complete before returning so a rapid re-sign-in
    // cannot be torn down by this call finishing after the new session starts.
    try {
      if (Platform.OS !== "web" && GoogleSignin) {
        await GoogleSignin.signOut().catch(() => {});
      }
      await authAdapter.signOut();
    } catch {}

    isSigningOutRef.current = false;
  }

  // ── sendPasswordReset ───────────────────────────────────────────────────────

  async function sendPasswordReset(email: string) {
    try {
      await authAdapter.sendPasswordReset(email);
    } catch (e: any) {
      throw mapAuthError(e);
    }
  }

  // ── resendVerification ──────────────────────────────────────────────────────

  async function resendVerification(targetEmail?: string) {
    try {
      const emailToSend = targetEmail || user?.email || authAdapter.getCurrentUser()?.email;
      if (emailToSend) {
        await authAdapter.sendVerificationEmail({ email: emailToSend } as any);
      }
    } catch (e: any) {
      throw mapAuthError(e);
    }
  }

  // ── updateLocalDisplayName ──────────────────────────────────────────────────

  function updateLocalDisplayName(name: string) {
    setUser((prev) => (prev ? { ...prev, displayName: name } : prev));
  }

  // ── refreshUser ─────────────────────────────────────────────────────────────

  async function refreshUser(): Promise<boolean> {
    try {
      let reloaded = authAdapter.refreshCurrentUser
        ? await authAdapter.refreshCurrentUser()
        : null;

      if (!reloaded) {
        const currentUser = authAdapter.getCurrentUser();
        if (currentUser) {
          await currentUser.reload();
          reloaded = authAdapter.getCurrentUser();
        }
      }

      if (reloaded) {
        let syncedProfile: { displayName: string; username?: string; photoURL: string | null } | null = null;
        if (reloaded.emailVerified) {
          try {
            const freshToken = await reloaded.getIdToken(true);
            setToken(freshToken);
          } catch {}
          syncedProfile = await syncUserToDb(
            reloaded.uid,
            reloaded.email,
            reloaded.displayName,
            reloaded.photoURL,
            undefined,
            reloaded.emailVerified,
          ).catch(() => null);
        }
        const authUser = buildAuthUser(reloaded, syncedProfile);
        if (reloaded.emailVerified && !authUser.username) {
          try {
            const userData = await db.get([COLLECTIONS.USERS, reloaded.uid]);
            if (userData?.username) authUser.username = userData.username as string;
          } catch {}
        }
        setUser(authUser);
        if (reloaded.emailVerified) {
          cacheAuthUser(authUser);
        }
        return reloaded.emailVerified;
      }
    } catch {}
    return false;
  }

  return {
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    resendVerification,
    refreshUser,
    updateLocalDisplayName,
  };
}
