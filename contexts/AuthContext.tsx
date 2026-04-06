import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
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
import { queryClient } from "@/lib/query-client";
import { clearAllMemCache, clearAllAsyncStorageCache } from "@/lib/cache/qr-cache";
import { clearAllAnonymousSessions } from "@/lib/cache/anonymous-session";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ?? "";

let GoogleSignin: any = null;
let statusCodes: any = null;

if (Platform.OS !== "web") {
  try {
    const mod = require("@react-native-google-signin/google-signin");
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
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
  refreshUser: () => Promise<void>;
  updateLocalDisplayName: (name: string) => void;
  googleRequest: ReturnType<typeof Google.useAuthRequest>[0];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export { getAuthErrorMessage };

async function reserveUsername(uid: string, displayName: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await generateUniqueUsername(displayName);
    try {
      await db.set(["usernames", candidate], { userId: uid, reservedAt: db.timestamp() });
      return candidate;
    } catch {
      // Race condition: another user claimed this username a moment ago, try again
    }
  }
  // Absolute fallback — UID suffix is guaranteed unique per user
  const fallback = "user" + uid.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "x");
  try { await db.set(["usernames", fallback], { userId: uid, reservedAt: db.timestamp() }); } catch {}
  return fallback;
}

async function syncUserToDb(uid: string, email: string | null, displayName: string | null, photoURL: string | null, overrideName?: string) {
  try {
    const userData = await db.get(["users", uid]);
    if (!userData) {
      const name = overrideName || displayName || email?.split("@")[0] || "User";
      const username = await reserveUsername(uid, name);
      await db.set(["users", uid], {
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
      await db.update(["users", uid], { username });
    }
  } catch (e: any) {
    if (e.message === "ACCOUNT_DELETED") throw new Error("This account has been deleted.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["profile", "email"],
  })
  useEffect(() => {
    const unsubscribe = authAdapter.onIdTokenChanged(async (adapterUser) => {
      if (adapterUser) {
        try {
          const idToken = await adapterUser.getIdToken();
          const authUser: AuthUser = {
            id: adapterUser.uid,
            email: adapterUser.email ?? "",
            displayName: adapterUser.displayName ?? adapterUser.email?.split("@")[0] ?? "User",
            photoURL: adapterUser.photoURL,
            emailVerified: adapterUser.emailVerified,
          };
          try {
            const userData = await db.get(["users", adapterUser.uid]);
            if (userData?.username) authUser.username = userData.username as string;
            // Prefer the photo stored in our DB (custom upload) over the auth-provider photo
            if (userData?.photoURL) authUser.photoURL = userData.photoURL as string;
          } catch {}
          setUser(authUser);
          setToken(idToken);
        } catch {
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" && GoogleSignin) {
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
        await authAdapter.signOut();
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
    } catch (e: any) {
      if (e.code === "auth/email-not-verified") throw e;
      throw mapFirebaseError(e);
    }
  }

  async function signUp(email: string, displayName: string, password: string) {
    try {
      const adapterUser = await authAdapter.signUp(email, password);
      await authAdapter.updateDisplayName(adapterUser, displayName);
      await authAdapter.sendVerificationEmail(adapterUser);
      await syncUserToDb(adapterUser.uid, adapterUser.email, displayName, null, displayName);
      await authAdapter.signOut();
      const err = new Error("VERIFICATION_SENT") as any;
      err.code = "auth/verification-sent";
      throw err;
    } catch (e: any) {
      if (e.code === "auth/verification-sent") throw e;
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
    syncUserToDb(adapterUser.uid, adapterUser.email, adapterUser.displayName, adapterUser.photoURL).catch(() => {});
  }

  async function signInWithGoogle() {
    if (Platform.OS !== "web" && GoogleSignin) {
      try {
        const silentResult = await GoogleSignin.signInSilently();
        if (silentResult?.type === "success" && silentResult?.data?.idToken) {
          try {
            await handleGoogleIdToken(silentResult.data.idToken);
            return;
          } catch {}
        }
      } catch {}
      const result = await GoogleSignin.signIn();
      if (result.type === "success" && result.data?.idToken) {
        try {
          await handleGoogleIdToken(result.data.idToken);
        } catch (e: any) {
          throw mapFirebaseError(e);
        }
      } else if (result.type === "cancelled") {
        const err = new Error(getAuthErrorMessage("auth/popup-closed-by-user"));
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
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      // Clear scan history for current user if signed in
      if (user?.id) {
        await AsyncStorage.removeItem(`local_scan_history_${user.id}`);
      }
      // Also clear QR content cache and downloads directory URI
      const allKeys = await AsyncStorage.getAllKeys();
      const qrContentKeys = allKeys.filter((k) => k.startsWith("qr_content_"));
      if (qrContentKeys.length > 0) await AsyncStorage.multiRemove(qrContentKeys);
      await AsyncStorage.removeItem("qrguard_downloads_dir_uri");
    } catch {}
    // Clear memory caches and AsyncStorage cache entries
    clearAllMemCache();
    clearAllAnonymousSessions();
    await clearAllAsyncStorageCache();
    queryClient.clear();
    try {
      if (Platform.OS !== "web" && GoogleSignin) {
        await GoogleSignin.signOut().catch(() => {});
      }
      await authAdapter.signOut();
    } catch {}
    setUser(null);
    setToken(null);
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

  async function refreshUser() {
    const currentUser = authAdapter.getCurrentUser();
    if (!currentUser) return;
    try {
      await currentUser.reload();
      const reloaded = authAdapter.getCurrentUser();
      if (reloaded) {
        const authUser: AuthUser = {
          id: reloaded.uid,
          email: reloaded.email ?? "",
          displayName: reloaded.displayName ?? reloaded.email?.split("@")[0] ?? "User",
          photoURL: reloaded.photoURL,
          emailVerified: reloaded.emailVerified,
        };
        try {
          await db.update(["users", reloaded.uid], {
            displayName: reloaded.displayName || "",
            photoURL: reloaded.photoURL || null,
          });
        } catch {}
        try {
          const userData = await db.get(["users", reloaded.uid]);
          if (userData?.username) authUser.username = userData.username as string;
        } catch {}
        setUser(authUser);
      }
    } catch {}
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
