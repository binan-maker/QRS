import { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";
import { Platform } from "react-native";
import { db } from "@/lib/db";
import { authAdapter } from "@/lib/auth";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  getAuthErrorMessage,
  mapFirebaseError,
  generateUniqueUsername,
} from "@/lib/auth/utils";
import { queryClient } from "@/shared/utils/query-client";
import { clearAllMemCache, clearAllAsyncStorageCache } from "@/services/cache/qr-cache";
import { clearAllAnonymousSessions } from "@/services/cache/anonymous-session";
import { prewarmUserData, clearPrewarmState } from "@/services/prewarm";
import { syncAvatarFromOutside, clearAvatarFromOutside } from "@/shared/contexts/AvatarContext";
import { validateEmail } from "@/shared/utils/email-validator";
import { trackLoginCompleted } from "@/lib/analytics";
import { COLLECTIONS } from "@/shared/constants/collections";
import { useNotificationStore } from "@/store/notificationStore";
import { clearUserProfileCache } from "@/services/user/cache";
import { clearCommentProfileCache } from "@/services/comments/cache";
import { API_BASE_URL } from "@/config/api";
import { ENV } from "@/config/env";
import { RTDB_TIMEOUT_MS } from "@/config/app";

const SERVER_BASE_URL = API_BASE_URL;

async function serverValidateEmail(email: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const res = await fetch(`${SERVER_BASE_URL}/api/validate-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(RTDB_TIMEOUT_MS),
    });
    // Only treat the server's verdict as authoritative on an explicit HTTP 200.
    // Any non-200 response (4xx, 5xx, or a proxy 502 when the backend is offline)
    // falls back to local validation so signup is never blocked by backend
    // unavailability. Firebase remains the final gate for email legitimacy.
    if (res.status === 200) {
      return await res.json();
    }
    return validateEmail(email);
  } catch {
    // Network error or connection refused — degrade gracefully to local check.
    return validateEmail(email);
  }
}

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = ENV.GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_IOS_CLIENT_ID ?? "";

let GoogleSignin: any = null;
let statusCodes: any = null;

if (Platform.OS !== "web") {
  try {
    const mod = require("@react-native-google-signin/google-signin");
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      forceCodeForRefreshToken: true,
      offlineAccess: false,
    });
  } catch {
    GoogleSignin = null;
    statusCodes = null;
  }
}

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  emailVerified: boolean;
  username?: string;
}

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
  googleRequest: ReturnType<typeof Google.useAuthRequest>[0];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export { getAuthErrorMessage };

async function reserveUsername(uid: string, displayName: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await generateUniqueUsername(displayName);
    try {
      await db.set([COLLECTIONS.USERNAMES, candidate], { userId: uid, reservedAt: db.timestamp() });
      return candidate;
    } catch {
    }
  }
  const fallback = "user" + uid.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "x");
  try { await db.set([COLLECTIONS.USERNAMES, fallback], { userId: uid, reservedAt: db.timestamp() }); } catch {}
  return fallback;
}

async function syncUserToDb(uid: string, email: string | null, displayName: string | null, photoURL: string | null, overrideName?: string) {
  try {
    const userData = await db.get([COLLECTIONS.USERS, uid]);
    if (!userData) {
      const name = overrideName || displayName || email?.split("@")[0] || "User";
      const username = await reserveUsername(uid, name);
      await db.set([COLLECTIONS.USERS, uid], {
        uid,
        email,
        displayName: name,
        photoURL: photoURL || null,
        isDeleted: false,
        createdAt: db.timestamp(),
        username,
      });
    } else if (userData.isDeleted) {
      throw new Error("ACCOUNT_DELETED");
    } else if (!userData.username) {
      const name = overrideName || displayName || userData.displayName || "User";
      const username = await reserveUsername(uid, name);
      await db.update([COLLECTIONS.USERS, uid], { username });
    }
  } catch (e: any) {
    if (e.message === "ACCOUNT_DELETED") throw new Error("This account has been deleted.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tracks whether Firebase's onIdTokenChanged has already resolved a session
  // from its AsyncStorage persistence layer. Used to skip the redundant
  // GoogleSignin.signInSilently() call on the ~80% of launches where Firebase
  // restores the session first (saves one Google SDK network round-trip).
  const firebaseSessionRestoredRef = useRef(false);

  // Prevents duplicate concurrent sign-out calls. Without this guard a second
  // call (e.g. from a navigation effect firing just after a manual sign-out)
  // could race the first, causing Firebase to be signed out twice and any
  // in-flight sign-in to be destroyed.
  const isSigningOutRef = useRef(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ["profile", "email"],
  });

  // Keep the Zustand authStore in sync with AuthContext so components that
  // read from useAuthStore selectors always see the same auth state.
  // Using getState() avoids creating a store subscription inside a provider.
  useEffect(() => {
    const store = useAuthStore.getState();
    store.setUser(user);
    store.setLoading(isLoading);
    store.setInitialized(!isLoading);
  }, [user, isLoading]);

  useEffect(() => {
    const unsubscribe = authAdapter.onIdTokenChanged(async (adapterUser) => {
      if (adapterUser) {
        // Mark that Firebase has restored a valid session so the signInSilently
        // guard below can skip its redundant call for this launch.
        firebaseSessionRestoredRef.current = true;
        // The persisted JWT can cache emailVerified: false even after the user
        // has verified — the token is stale until refreshed. Before treating
        // the session as unverified, reload from Firebase to get the latest state.
        let resolvedUser = adapterUser;
        if (!adapterUser.emailVerified) {
          try {
            await adapterUser.reload();
            const fresh = authAdapter.getCurrentUser();
            if (!fresh || !fresh.emailVerified) {
              // Genuinely unverified — clear the session
              setUser(null);
              setToken(null);
              setIsLoading(false);
              return;
            }
            resolvedUser = fresh;
          } catch {
            setUser(null);
            setToken(null);
            setIsLoading(false);
            return;
          }
        }
        try {
          const idToken = await resolvedUser.getIdToken();
          // If the TanStack Query cache already has the user's profile (from an
          // earlier fetch this session), include username/photoURL immediately so
          // there is never a gap where user.username is undefined.  Without this,
          // every Firebase token refresh (hourly) calls setUser without a username,
          // and if the prefetchQuery cache is still fresh it skips its queryFn —
          // leaving user.username === undefined until the next cache expiry.
          const cachedProfile = queryClient.getQueryData<any>(["userProfile", resolvedUser.uid]);
          // Prefer the cached Firestore photo (app-uploaded) over the Firebase
          // Auth photo (always Google profile picture for Google sign-in users).
          // This ensures the correct photo is shown immediately on token refresh
          // without waiting for the async prefetchQuery to complete.
          const initialPhotoURL =
            (cachedProfile?.photoURL as string | undefined) ||
            resolvedUser.photoURL ||
            undefined;
          const authUser: AuthUser = {
            id: resolvedUser.uid,
            email: resolvedUser.email ?? "",
            displayName: resolvedUser.displayName ?? resolvedUser.email?.split("@")[0] ?? "User",
            photoURL: initialPhotoURL,
            emailVerified: resolvedUser.emailVerified,
            username: (cachedProfile?.username as string) || undefined,
          };
          setUser(authUser);
          setToken(idToken);
          setIsLoading(false);
          // Pre-warm history/favorites/stats caches NOW so the History tab
          // renders with data on first mount instead of showing skeletons.
          prewarmUserData(resolvedUser.uid).catch(() => {});
          queryClient.prefetchQuery({
            queryKey: ["userProfile", resolvedUser.uid],
            queryFn: async () => {
              const userData = await db.get([COLLECTIONS.USERS, resolvedUser.uid]);
              if (userData) {
                const firestorePhotoURL = userData.photoURL as string | undefined;
                setUser((prev) => {
                  if (!prev || prev.id !== resolvedUser.uid) return prev;
                  return {
                    ...prev,
                    username: (userData.username as string) || prev.username,
                    // Prefer Firestore photo (app-uploaded) over Google Auth photo.
                    // Fall back to prev.photoURL only when Firestore has nothing stored.
                    photoURL: firestorePhotoURL || prev.photoURL,
                  };
                });
                // Push the Firestore photo into AvatarContext immediately so the
                // home screen avatar updates without waiting for the profile tab.
                if (firestorePhotoURL) {
                  syncAvatarFromOutside(firestorePhotoURL);
                }
              }
              return userData;
            },
            staleTime: 5 * 60 * 1000,
          });
        } catch {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        queryClient.removeQueries({ queryKey: ["userProfile"] });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" && GoogleSignin) {
      // ⚠️  Guard: delay 800 ms to give Firebase's onIdTokenChanged time to fire
      // first. For returning users whose session is persisted in AsyncStorage,
      // Firebase typically resolves within 50–400 ms — well within this window.
      // If Firebase has already restored the session we skip the Google SDK call
      // entirely (saves one network round-trip on every app launch).
      // If Firebase does NOT resolve within 800 ms (new user, sign-out, or a
      // rare persistence failure), signInSilently runs as it always did.
      const timer = setTimeout(() => {
        if (firebaseSessionRestoredRef.current) return; // already signed in
        GoogleSignin.signInSilently()
          .then(async (result: any) => {
            if (result?.type === "success" && result?.data?.idToken) {
              try {
                const adapterUser = await authAdapter.signInWithGoogleIdToken(result.data.idToken);
                await syncUserToDb(adapterUser.uid, adapterUser.email, adapterUser.displayName, adapterUser.photoURL);
              } catch {}
            }
          })
          .catch(() => {});
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && googleResponse?.type === "success") {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        handleGoogleAccessToken(authentication.accessToken);
      }
    }
  }, [googleResponse]);

  async function signIn(email: string, password: string) {
    try {
      const adapterUser = await authAdapter.signIn(email, password);
      if (!adapterUser.emailVerified) {
        const err = new Error(getAuthErrorMessage("auth/email-not-verified")) as any;
        err.code = "auth/email-not-verified";
        throw err;
      }
      await syncUserToDb(adapterUser.uid, adapterUser.email, adapterUser.displayName, adapterUser.photoURL);
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

  async function signUp(email: string, displayName: string, password: string) {
    try {
      const emailValidation = await serverValidateEmail(email);
      if (!emailValidation.valid) {
        const err = new Error(emailValidation.reason || "Please use a real email address.") as any;
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
      syncUserToDb(adapterUser.uid, adapterUser.email, adapterUser.displayName, adapterUser.photoURL).catch(() => {});
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

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
    syncUserToDb(adapterUser.uid, adapterUser.email, adapterUser.displayName, adapterUser.photoURL).catch(() => {});
  }

  async function signInWithGoogle() {
    if (Platform.OS !== "web" && GoogleSignin) {
      // ── 1. Silent sign-in: succeeds instantly for returning users ────────────
      try {
        const silentResult = await GoogleSignin.signInSilently();
        if (silentResult?.type === "success" && silentResult?.data?.idToken) {
          try {
            await handleGoogleIdToken(silentResult.data.idToken);
            return;
          } catch {}
        }
      } catch {
        // No saved credential — fall through to interactive sign-in
      }

      // ── 2. Interactive sign-in ───────────────────────────────────────────────
      // iOS only: ASWebAuthenticationSession cannot be presented while the login
      // screen's entrance animation is still running (~460 ms). A short delay
      // lets the transition settle so the system auth sheet can be shown cleanly.
      // Android's Credential Manager has no such constraint — no delay needed.
      if (Platform.OS === "ios") {
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }

      let result: any;
      try {
        result = await GoogleSignin.signIn();
      } catch (e: any) {
        // SDK threw — usually means iosClientId is missing or misconfigured.
        // Map to a friendly error rather than exposing internal SDK messages.
        throw mapFirebaseError(e);
      }

      if (result.type === "success" && result.data?.idToken) {
        try {
          await handleGoogleIdToken(result.data.idToken);
        } catch (e: any) {
          throw mapFirebaseError(e);
        }
      } else if (result.type === "cancelled") {
        // User tapped Cancel on the iOS system prompt or the Google picker.
        // Using a specific code so the UI can dismiss quietly instead of showing
        // a red error banner (the user already knows they cancelled).
        const err = new Error("Sign-in was cancelled.") as any;
        err.code = "auth/cancelled-by-user";
        throw err;
      } else if (result.type === "noSavedCredentialFound") {
        // Android Credential Manager: no account saved on device.
        // On iOS this is uncommon, but handle defensively — treat as cancellation.
        const err = new Error("Sign-in was cancelled.") as any;
        err.code = "auth/cancelled-by-user";
        throw err;
      } else {
        // Any other result type (e.g. "signInRequired", unknown future types).
        // Never fall through silently — always throw so googleLoading is reset.
        const err = new Error("Google sign-in could not be completed. Please try again.") as any;
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
      await signInWithGoogle();
    } else {
      await signInWithGoogle();
    }
  }

  async function signOut() {
    // Prevent duplicate concurrent sign-outs. A second call (e.g. from a
    // navigation effect) while the first is still awaiting authAdapter.signOut()
    // could destroy a newly created session if the user signs back in quickly.
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    // Clear auth state immediately — UI responds at once, no visible delay.
    const signedOutUserId = user?.id ?? null;
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
    // user's avatar, even for a single frame.
    clearAvatarFromOutside();

    // Await provider sign-out atomically. This MUST complete before the function
    // returns so that a rapid re-sign-in cannot be torn down by this call
    // completing after the new session is already established.
    try {
      if (Platform.OS !== "web" && GoogleSignin) {
        await GoogleSignin.signOut().catch(() => {});
      }
      await authAdapter.signOut();
    } catch {}

    isSigningOutRef.current = false;

    // Pure AsyncStorage cache cleanup — safe to fire-and-forget because it only
    // removes stale scan/QR cache keys, not any session or credential data.
    (async () => {
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
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

  async function sendPasswordReset(email: string) {
    try {
      await authAdapter.sendPasswordReset(email);
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

  async function resendVerification() {
    try {
      const currentUser = authAdapter.getCurrentUser();
      if (currentUser) await authAdapter.sendVerificationEmail(currentUser);
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

  function updateLocalDisplayName(name: string) {
    setUser((prev) => prev ? { ...prev, displayName: name } : prev);
  }

  async function refreshUser(): Promise<boolean> {
    const currentUser = authAdapter.getCurrentUser();
    if (!currentUser) return false;
    try {
      await currentUser.reload();
      // Read the user object AFTER reload — this is the authoritative fresh value.
      // Do NOT use the `user` state variable here; React state is stale until the
      // next render and checking it immediately after setUser() reads the old value.
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
          displayName: reloaded.displayName ?? reloaded.email?.split("@")[0] ?? "User",
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
        // Callers that need to act on the result (e.g. VerifyEmailScreen) must
        // use this return value — checking user?.emailVerified immediately after
        // awaiting refreshUser() reads the stale pre-render value.
        return reloaded.emailVerified;
      }
    } catch {}
    return false;
  }

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
    [user, token, isLoading, googleRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
