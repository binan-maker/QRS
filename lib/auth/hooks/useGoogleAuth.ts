// ── Google auth hook ──────────────────────────────────────────────────────────
// Handles all Google Sign-In logic:
//   - Platform-specific GoogleSignin SDK setup (native)
//   - expo-auth-session setup (web)
//   - Silent sign-in on launch (native)
//   - Web OAuth response handler
//   - Interactive signInWithGoogle / switchGoogleAccount

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { authAdapter } from "@/lib/auth";
import { syncUserToDb } from "@/lib/auth/user-sync";
import { mapFirebaseError } from "@/lib/auth/utils";
import { trackLoginCompleted } from "@/lib/analytics";
import { ENV } from "@/config/env";
import type { AuthUser } from "@/lib/auth/types";

WebBrowser.maybeCompleteAuthSession();

// ── Native GoogleSignin SDK setup ─────────────────────────────────────────────
// Loaded lazily so the web bundle is never affected.
let GoogleSignin: any = null;

if (Platform.OS !== "web") {
  try {
    const mod = require("@react-native-google-signin/google-signin");
    GoogleSignin = mod.GoogleSignin;
    GoogleSignin.configure({
      webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
      iosClientId: ENV.GOOGLE_IOS_CLIENT_ID,
      forceCodeForRefreshToken: true,
      offlineAccess: false,
    });
  } catch {
    GoogleSignin = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface Params {
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  setToken: Dispatch<SetStateAction<string | null>>;
  /** Set by useFirebaseSession when Firebase restores a session. Prevents a
   *  redundant signInSilently call on the ~80% of launches where Firebase
   *  restores the session first. */
  firebaseSessionRestoredRef: MutableRefObject<boolean>;
}

export function useGoogleAuth({ setUser, setToken, firebaseSessionRestoredRef }: Params) {
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: ENV.GOOGLE_WEB_CLIENT_ID,
    androidClientId: ENV.GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: ENV.GOOGLE_IOS_CLIENT_ID,
    scopes: ["profile", "email"],
  });

  // ── Internal helpers ────────────────────────────────────────────────────────

  async function handleGoogleIdToken(idToken: string) {
    const adapterUser = await authAdapter.signInWithGoogleIdToken(idToken);
    const firebaseToken = await adapterUser.getIdToken();
    setUser({
      id: adapterUser.uid,
      email: adapterUser.email ?? "",
      displayName: adapterUser.displayName ?? adapterUser.email?.split("@")[0] ?? "User",
      photoURL: adapterUser.photoURL,
      emailVerified: adapterUser.emailVerified,
    });
    setToken(firebaseToken);
    trackLoginCompleted("google");
    syncUserToDb(
      adapterUser.uid,
      adapterUser.email,
      adapterUser.displayName,
      adapterUser.photoURL,
    ).catch(() => {});
  }

  async function handleGoogleAccessToken(accessToken: string) {
    try {
      const adapterUser = await authAdapter.signInWithGoogleToken(accessToken);
      const idToken = await adapterUser.getIdToken();
      setUser({
        id: adapterUser.uid,
        email: adapterUser.email ?? "",
        displayName: adapterUser.displayName ?? adapterUser.email?.split("@")[0] ?? "User",
        photoURL: adapterUser.photoURL,
        emailVerified: adapterUser.emailVerified,
      });
      setToken(idToken);
      trackLoginCompleted("google");
      syncUserToDb(
        adapterUser.uid,
        adapterUser.email,
        adapterUser.displayName,
        adapterUser.photoURL,
      ).catch(() => {});
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Native: delayed silent sign-in on launch.
  // 800 ms lets Firebase's onIdTokenChanged fire first for returning users
  // (typically 50–400 ms). If Firebase restores the session, we skip this call.
  useEffect(() => {
    if (Platform.OS !== "web" && GoogleSignin) {
      const timer = setTimeout(() => {
        if (firebaseSessionRestoredRef.current) return;
        GoogleSignin.signInSilently()
          .then(async (result: any) => {
            if (result?.type === "success" && result?.data?.idToken) {
              try {
                const adapterUser = await authAdapter.signInWithGoogleIdToken(
                  result.data.idToken,
                );
                await syncUserToDb(
                  adapterUser.uid,
                  adapterUser.email,
                  adapterUser.displayName,
                  adapterUser.photoURL,
                );
              } catch {}
            }
          })
          .catch(() => {});
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Web: handle the OAuth redirect response from expo-auth-session.
  useEffect(() => {
    if (Platform.OS === "web" && googleResponse?.type === "success") {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        handleGoogleAccessToken(authentication.accessToken);
      }
    }
  }, [googleResponse]);

  // ── Public API ──────────────────────────────────────────────────────────────

  async function signInWithGoogle() {
    if (Platform.OS !== "web" && GoogleSignin) {
      // 1. Silent sign-in: instant for returning users.
      try {
        const silentResult = await GoogleSignin.signInSilently();
        if (silentResult?.type === "success" && silentResult?.data?.idToken) {
          try {
            await handleGoogleIdToken(silentResult.data.idToken);
            return;
          } catch {}
        }
      } catch {
        // No saved credential — fall through to interactive sign-in.
      }

      // 2. Interactive sign-in.
      // iOS only: ASWebAuthenticationSession cannot be presented while the
      // login screen's entrance animation is running (~460 ms).
      if (Platform.OS === "ios") {
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }

      let result: any;
      try {
        result = await GoogleSignin.signIn();
      } catch (e: any) {
        throw mapFirebaseError(e);
      }

      if (result.type === "success" && result.data?.idToken) {
        try {
          await handleGoogleIdToken(result.data.idToken);
        } catch (e: any) {
          throw mapFirebaseError(e);
        }
      } else if (
        result.type === "cancelled" ||
        result.type === "noSavedCredentialFound"
      ) {
        const err = new Error("Sign-in was cancelled.") as any;
        err.code = "auth/cancelled-by-user";
        throw err;
      } else {
        const err = new Error(
          "Google sign-in could not be completed. Please try again.",
        ) as any;
        err.code = "auth/google-unknown";
        throw err;
      }
    } else {
      await promptGoogleAsync();
    }
  }

  async function switchGoogleAccount() {
    if (Platform.OS !== "web" && GoogleSignin) {
      try {
        await GoogleSignin.signOut();
      } catch {}
    }
    await signInWithGoogle();
  }

  return { googleRequest, signInWithGoogle, switchGoogleAccount };
}
