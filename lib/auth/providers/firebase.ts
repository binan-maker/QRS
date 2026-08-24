import {
  createUserWithEmailAndPassword,
  deleteUser as deleteFirebaseUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import type { AuthAdapter, AuthAdapterUser } from "../adapter";

function wrapUser(user: any): AuthAdapterUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    getIdToken: (forceRefresh = false) => user.getIdToken(forceRefresh),
    reload: () => user.reload(),
  };
}

export const firebaseAuthProvider: AuthAdapter = {
  onIdTokenChanged(cb) {
    return onIdTokenChanged(getFirebaseAuth(), (user) => cb(user ? wrapUser(user) : null));
  },
  getCurrentUser() {
    const user = getFirebaseAuth().currentUser;
    return user ? wrapUser(user) : null;
  },
  async signIn(email, password) {
    return wrapUser((await signInWithEmailAndPassword(getFirebaseAuth(), email, password)).user);
  },
  async signUp(email, password) {
    return wrapUser((await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)).user);
  },
  async signOut() {
    await firebaseSignOut(getFirebaseAuth());
  },
  async signInWithGoogleToken(token) {
    return wrapUser((await signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(null, token))).user);
  },
  async signInWithGoogleIdToken(token) {
    return wrapUser((await signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(token))).user);
  },
  async sendPasswordReset(email) {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  },
  async sendVerificationEmail(user) {
    const current = getFirebaseAuth().currentUser;
    if (!current || current.uid !== user.uid) throw new Error("No active Firebase user");
    await sendEmailVerification(current);
  },
  async updateDisplayName(user, displayName) {
    const current = getFirebaseAuth().currentUser;
    if (!current || current.uid !== user.uid) throw new Error("No active Firebase user");
    await updateProfile(current, { displayName });
  },
  async reauthenticate(user, email, password) {
    const current = getFirebaseAuth().currentUser;
    if (!current || current.uid !== user.uid) throw new Error("No active Firebase user");
    await reauthenticateWithCredential(current, EmailAuthProvider.credential(email, password));
  },
  async deleteUser(user) {
    const current = getFirebaseAuth().currentUser;
    if (!current || current.uid !== user.uid) throw new Error("No active Firebase user");
    await deleteFirebaseUser(current);
  },
  async checkEmailExists(email) {
    try {
      const { fetchSignInMethodsForEmail } = await import("firebase/auth");
      return (await fetchSignInMethodsForEmail(getFirebaseAuth(), email)).length > 0;
    } catch {
      return false;
    }
  },
  getProviderIds() {
    return getFirebaseAuth().currentUser?.providerData.map((provider) => provider.providerId) ?? [];
  },
};