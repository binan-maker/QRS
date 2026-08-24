"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { createSession, destroySession } from "@/lib/auth";

interface AuthContextValue {
  user: any | null | undefined;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(getFirebaseAuth(), async (nextUser: any) => {
    setUser(nextUser);
    setLoading(false);
    if (nextUser) await createSession(await nextUser.getIdToken());
  }), []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    await createSession(await result.user.getIdToken());
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    await createSession(await result.user.getIdToken());
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    await createSession(await result.user.getIdToken());
  }, []);

  const sendPasswordReset = useCallback(
    (email: string) => sendPasswordResetEmail(getFirebaseAuth(), email),
    [],
  );

  const signOut = useCallback(async () => {
    await destroySession();
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth() must be used inside <AuthProvider>");
  return context;
}