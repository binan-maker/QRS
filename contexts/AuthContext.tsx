import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { db } from "@/lib/db";
import { authAdapter } from "@/lib/auth";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  getAuthErrorMessage,
  mapFirebaseError,
  generateUniqueUsername,
} from "@/lib/auth/utils";

WebBrowser.maybeCompleteAuthSession();

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
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
  googleRequest: ReturnType<typeof Google.useAuthRequest>[0];
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ?? "";

export { getAuthErrorMessage };

async function syncUserToDb(uid: string, email: string | null, displayName: string | null, photoURL: string | null, overrideName?: string) {
  try {
    const userData = await db.get(["users", uid]);
    if (!userData) {
      const name = overrideName || displayName || email?.split("@")[0] || "User";
      const username = await generateUniqueUsername(name);
      await db.set(["users", uid], {
        uid,
        email,
        displayName: name,
        photoURL: photoURL || null,
        isDeleted: false,
        createdAt: db.timestamp(),
        username,
      });
      try {
        await db.set(["usernames", username], {
          userId: uid,
          reservedAt: db.timestamp(),
        });
      } catch {}
    } else if (userData.isDeleted) {
      throw new Error("ACCOUNT_DELETED");
    } else if (!userData.username) {
      const name = overrideName || displayName || userData.displayName || "User";
      const username = await generateUniqueUsername(name);
      try {
        await db.update(["users", uid], { username });
        await db.set(["usernames", username], {
          userId: uid,
          reservedAt: db.timestamp(),
        });
      } catch {}
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
  });

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
    if (googleResponse?.type === "success") {
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
      throw mapFirebaseError(e);
    }
  }

  async function signInWithGoogle() {
    await promptGoogleAsync();
  }

  async function signOut() {
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      await AsyncStorage.removeItem("local_scan_history");
    } catch {}
    await authAdapter.signOut();
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
      sendPasswordReset,
      resendVerification,
      refreshUser,
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
