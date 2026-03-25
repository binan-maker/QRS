// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE AUTH PROVIDER — implements AuthAdapter using Firebase Auth SDK.
// ───────────────────────────────────────────────────────────────────────────────
// This is the ONLY file that imports the Firebase Auth SDK.
// All other files use the adapter interface from lib/auth.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onIdTokenChanged as fbOnIdTokenChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser as fbDeleteUser,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import type { AuthAdapter, AuthAdapterUser } from "../adapter";

function wrapUser(fbUser: FirebaseUser): AuthAdapterUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    emailVerified: fbUser.emailVerified,
    getIdToken: () => fbUser.getIdToken(),
    reload: () => fbUser.reload(),
  };
}

export const firebaseAuthProvider: AuthAdapter = {
  onIdTokenChanged(cb) {
    const unsub = fbOnIdTokenChanged(firebaseAuth, (fbUser) => {
      cb(fbUser ? wrapUser(fbUser) : null);
    });
    return unsub;
  },

  getCurrentUser() {
    const fbUser = firebaseAuth.currentUser;
    return fbUser ? wrapUser(fbUser) : null;
  },

  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return wrapUser(cred.user);
  },

  async signUp(email, password) {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    return wrapUser(cred.user);
  },

  async signOut() {
    await fbSignOut(firebaseAuth);
  },

  async signInWithGoogleToken(accessToken) {
    const credential = GoogleAuthProvider.credential(null, accessToken);
    const cred = await signInWithCredential(firebaseAuth, credential);
    return wrapUser(cred.user);
  },

  async signInWithGoogleIdToken(idToken) {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(firebaseAuth, credential);
    return wrapUser(cred.user);
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(firebaseAuth, email);
  },

  async sendVerificationEmail(user) {
    const fbUser = firebaseAuth.currentUser;
    if (fbUser && fbUser.uid === user.uid) {
      await sendEmailVerification(fbUser);
    }
  },

  async updateDisplayName(user, displayName) {
    const fbUser = firebaseAuth.currentUser;
    if (fbUser && fbUser.uid === user.uid) {
      await updateProfile(fbUser, { displayName });
    }
  },

  async reauthenticate(user, email, password) {
    const fbUser = firebaseAuth.currentUser;
    if (fbUser && fbUser.uid === user.uid) {
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(fbUser, credential);
    }
  },

  async deleteUser(user) {
    const fbUser = firebaseAuth.currentUser;
    if (fbUser && fbUser.uid === user.uid) {
      await fbDeleteUser(fbUser);
    }
  },
};
