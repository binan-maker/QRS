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
import { mapFirebaseError, getAuthErrorMessage } from "@/lib/auth/utils";
import { trackLoginCompleted } from "@/lib/analytics";
import { db } from "@/lib/db";
import { COLLECTIONS } from "@/shared/constants/collections";
import { queryClient } from "@/shared/services/query-client";
import { clearAllMemCache, clearAllAsyncStorageCache } from "@/services/cache/qr-cache";
import { clearAllAnonymousSessions } from "@/services/cache/anonymous-session";
import { clearPrewarmState } from "@/services/prewarm";
import { clearAvatarFromOutside } from "@/shared/contexts/AvatarContext";
import { clearUserProfileCache } from "@/services/user/cache";
import { clearCommentProfileCache } from "@/services/comments/cache";
import { useNotificationStore } from "@/store/notificationStore";
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

  async function signIn(email: string, password: string) {
    try {
      const adapterUser = await authAdapter.signIn(email, password);
      if (!adapterUser.emailVerified) {
        const err = new Error(getAuthErrorMessage("auth/email-not-verified")) as any;
        err.code = "auth/email-not-verified";
        throw err;
      }
      await syncUserToDb(
        adapterUser.uid,
        adapterUser.email,
        adapterUser.displayName,
        adapterUser.photoURL,
      );
      const idToken = await adapterUser.getIdToken();
      setUser({
        id: adapterUser.uid,
        email: adapterUser.email ?? "",
        displayName: adapterUser.displayName ?? adapterUser.email?.split("@")[0] ?? "User",
        photoURL: adapterUser.photoURL,
        emailVerified: adapterUser.emailVerified,
      });
      setToken(idToken);
      trackLoginCompleted("email");
    } catch (e: any) {
      if (e.code === "auth/email-not-verified") throw e;
      throw mapFirebaseError(e);
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
      const adapterUser = await authAdapter.signUp(email, password);
      await authAdapter.updateDisplayName(adapterUser, displayName);
      await authAdapter.sendVerificationEmail(adapterUser);
      await authAdapter.signOut();
      const err = new Error("VERIFICATION_SENT") as any;
      err.code = "auth/verification-sent";
      throw err;
    } catch (e: any) {
      if (e.code === "auth/verification-sent") throw e;
      if (e.code === "auth/invalid-email-domain") throw e;
      throw mapFirebaseError(e);
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
    queryClient.clear();
    clearAllMemCache();
    clearUserProfileCache();
    clearCommentProfileCache();
    useNotificationStore.getState().reset();
    clearPrewarmState();
    clearAllAnonymousSessions();
    // Clear avatar cache synchronously so the next user never sees a previous
    // user's avatar even for a single frame.
    clearAvatarFromOutside();

    // Provider sign-out must complete before returning so a rapid re-sign-in
    // cannot be torn down by this call finishing after the new session starts.
    try {
      if (Platform.OS !== "web" && GoogleSignin) {
        await GoogleSignin.signOut().catch(() => {});
      }
      await authAdapter.signOut();
    } catch {}

    isSigningOutRef.current = false;

    // Fire-and-forget: AsyncStorage cleanup (scan / QR cache keys only).
    (async () => {
      try {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        if (signedOutUserId) {
          await AsyncStorage.removeItem(`local_scan_history_${signedOutUserId}`);
        }
        const allKeys = await AsyncStorage.getAllKeys();
        const qrContentKeys = allKeys.filter((k) => k.startsWith("qr_content_"));
        if (qrContentKeys.length > 0) await AsyncStorage.multiRemove(qrContentKeys);
        await AsyncStorage.removeItem("qrguard_downloads_dir_uri");
      } catch {}
      await clearAllAsyncStorageCache().catch(() => {});
    })();
  }

  // ── sendPasswordReset ───────────────────────────────────────────────────────

  async function sendPasswordReset(email: string) {
    try {
      await authAdapter.sendPasswordReset(email);
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

  // ── resendVerification ──────────────────────────────────────────────────────

  async function resendVerification() {
    try {
      const currentUser = authAdapter.getCurrentUser();
      if (currentUser) await authAdapter.sendVerificationEmail(currentUser);
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

  // ── updateLocalDisplayName ──────────────────────────────────────────────────

  function updateLocalDisplayName(name: string) {
    setUser((prev) => (prev ? { ...prev, displayName: name } : prev));
  }

  // ── refreshUser ─────────────────────────────────────────────────────────────

  async function refreshUser(): Promise<boolean> {
    const currentUser = authAdapter.getCurrentUser();
    if (!currentUser) return false;
    try {
      await currentUser.reload();
      // Read AFTER reload — React state is stale until the next render.
      const reloaded = authAdapter.getCurrentUser();
      if (reloaded) {
        if (reloaded.emailVerified) {
          try {
            const freshToken = await reloaded.getIdToken(true);
            setToken(freshToken);
          } catch {}
          await syncUserToDb(
            reloaded.uid,
            reloaded.email,
            reloaded.displayName,
            reloaded.photoURL,
          ).catch(() => {});
        }
        const authUser: AuthUser = {
          id: reloaded.uid,
          email: reloaded.email ?? "",
          displayName:
            reloaded.displayName ?? reloaded.email?.split("@")[0] ?? "User",
          photoURL: reloaded.photoURL,
          emailVerified: reloaded.emailVerified,
        };
        if (reloaded.emailVerified) {
          try {
            await db.update([COLLECTIONS.USERS, reloaded.uid], {
              displayName: reloaded.displayName || "",
              photoURL: reloaded.photoURL || null,
            });
          } catch {}
          try {
            const userData = await db.get([COLLECTIONS.USERS, reloaded.uid]);
            if (userData?.username) authUser.username = userData.username as string;
          } catch {}
        }
        setUser(authUser);
        // Return the fresh emailVerified from Firebase, not from React state.
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
