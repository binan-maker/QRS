import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase";
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

const GOOGLE_WEB_CLIENT_ID = "971359442211-dppv9u14kun8mo5c0e07pr6f6veh81aa.apps.googleusercontent.com";

export { getAuthErrorMessage };

async function syncUserToFirestore(fbUser: FirebaseUser, displayName?: string) {
  try {
    const userRef = doc(firestore, "users", fbUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const name = displayName || fbUser.displayName || fbUser.email?.split("@")[0] || "User";
      const username = await generateUniqueUsername(name);
      await setDoc(userRef, {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: name,
        photoURL: fbUser.photoURL || null,
        isDeleted: false,
        createdAt: serverTimestamp(),
        username,
      });
      try {
        await setDoc(doc(firestore, "usernames", username), {
          userId: fbUser.uid,
          reservedAt: serverTimestamp(),
        });
      } catch {}
    } else if (snap.data().isDeleted) {
      throw new Error("ACCOUNT_DELETED");
    } else if (!snap.data().username) {
      const name = displayName || fbUser.displayName || snap.data().displayName || "User";
      const username = await generateUniqueUsername(name);
      try {
        await updateDoc(userRef, { username });
        await setDoc(doc(firestore, "usernames", username), {
          userId: fbUser.uid,
          reservedAt: serverTimestamp(),
        });
      } catch {}
    }
  } catch (e: any) {
    if (e.message === "ACCOUNT_DELETED") throw new Error("This account has been deleted.");
  }
}

function toAuthUser(fbUser: FirebaseUser): AuthUser {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? "",
    displayName: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "User",
    photoURL: fbUser.photoURL,
    emailVerified: fbUser.emailVerified,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: "971359442211-j2emebstu4e63sd7u56k852ok1sb9rs2.apps.googleusercontent.com",
    scopes: ["profile", "email"],
  });

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const authUser = toAuthUser(fbUser);
          try {
            const userSnap = await getDoc(doc(firestore, "users", fbUser.uid));
            if (userSnap.exists() && userSnap.data().username) {
              authUser.username = userSnap.data().username as string;
            }
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
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      if (!cred.user.emailVerified) {
        await firebaseSignOut(firebaseAuth);
        const err = new Error(getAuthErrorMessage("auth/email-not-verified")) as any;
        err.code = "auth/email-not-verified";
        throw err;
      }
      await syncUserToFirestore(cred.user);
      const idToken = await cred.user.getIdToken();
      setUser(toAuthUser(cred.user));
      setToken(idToken);
    } catch (e: any) {
      if (e.code === "auth/email-not-verified") throw e;
      throw mapFirebaseError(e);
    }
  }

  async function signUp(email: string, displayName: string, password: string) {
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(cred.user, { displayName });
      await sendEmailVerification(cred.user);
      await syncUserToFirestore(cred.user, displayName);
      await firebaseSignOut(firebaseAuth);
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
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const cred = await signInWithCredential(firebaseAuth, credential);
      await syncUserToFirestore(cred.user);
      const idToken = await cred.user.getIdToken();
      setUser(toAuthUser(cred.user));
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
    await firebaseSignOut(firebaseAuth);
    setUser(null);
    setToken(null);
  }

  async function sendPasswordReset(email: string) {
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

  async function resendVerification() {
    try {
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) await sendEmailVerification(currentUser);
    } catch (e: any) {
      throw mapFirebaseError(e);
    }
  }

  async function refreshUser() {
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) return;
    try {
      await fbUser.reload();
      const reloaded = firebaseAuth.currentUser;
      if (reloaded) {
        const authUser = toAuthUser(reloaded);
        try {
          await updateDoc(doc(firestore, "users", reloaded.uid), {
            displayName: reloaded.displayName || "",
            photoURL: reloaded.photoURL || null,
          });
        } catch {}
        try {
          const userSnap = await getDoc(doc(firestore, "users", reloaded.uid));
          if (userSnap.exists() && userSnap.data().username) {
            authUser.username = userSnap.data().username as string;
          }
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
