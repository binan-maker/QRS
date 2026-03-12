import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, displayName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  googleRequest: ReturnType<typeof Google.useAuthRequest>[0];
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GOOGLE_WEB_CLIENT_ID = "971359442211-dppv9u14kun8mo5c0e07pr6f6veh81aa.apps.googleusercontent.com";

async function syncUserToFirestore(fbUser: FirebaseUser, displayName?: string) {
  try {
    const userRef = doc(firestore, "users", fbUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: displayName || fbUser.displayName || fbUser.email?.split("@")[0] || "User",
        photoURL: fbUser.photoURL || null,
        isDeleted: false,
        createdAt: serverTimestamp(),
      });
    } else if (snap.data().isDeleted) {
      throw new Error("ACCOUNT_DELETED");
    }
  } catch (e: any) {
    // Only rethrow the deleted-account sentinel; swallow all Firestore
    // permission / network errors so they never block the auth flow.
    if (e.message === "ACCOUNT_DELETED") throw new Error("This account has been deleted.");
  }
}

function toAuthUser(fbUser: FirebaseUser): AuthUser {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? "",
    displayName: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "User",
    photoURL: fbUser.photoURL,
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

  // onIdTokenChanged fires on sign-in, sign-out, and token refresh (every hour)
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setUser(toAuthUser(fbUser));
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
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    await syncUserToFirestore(cred.user);
    const idToken = await cred.user.getIdToken();
    setUser(toAuthUser(cred.user));
    setToken(idToken);
  }

  async function signUp(email: string, displayName: string, password: string) {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(cred.user, { displayName });
    await syncUserToFirestore(cred.user, displayName);
    const idToken = await cred.user.getIdToken();
    setUser(toAuthUser(cred.user));
    setToken(idToken);
  }

  async function handleGoogleAccessToken(accessToken: string) {
    const credential = GoogleAuthProvider.credential(null, accessToken);
    const cred = await signInWithCredential(firebaseAuth, credential);
    await syncUserToFirestore(cred.user);
    const idToken = await cred.user.getIdToken();
    setUser(toAuthUser(cred.user));
    setToken(idToken);
  }

  async function signInWithGoogle() {
    await promptGoogleAsync();
  }

  async function signOut() {
    await firebaseSignOut(firebaseAuth);
    setUser(null);
    setToken(null);
  }

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signUp, signOut, signInWithGoogle, googleRequest }),
    [user, token, isLoading, googleRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
