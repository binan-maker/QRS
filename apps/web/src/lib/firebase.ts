/**
 * Firebase client SDK initialisation (browser + server-safe).
 *
 * Firebase client SDK is always safe to initialise in both environments —
 * it does not make network connections until Auth/Firestore APIs are called.
 *
 * For server-side Admin SDK see apps/web/src/lib/firebase-admin.ts.
 */

"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import { publicEnv } from "@/lib/env";

// ─── App singleton ────────────────────────────────────────────────────────────

let _app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0]!;
    return _app;
  }
  _app = initializeApp(publicEnv.firebase);
  return _app;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

let _auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  _auth = getAuth(app);

  // Connect to emulator in development if configured
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
  ) {
    connectAuthEmulator(
      _auth,
      `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`,
      { disableWarnings: true },
    );
  }

  return _auth;
}

// ─── Auth providers ───────────────────────────────────────────────────────────

export function getGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope("profile");
  provider.addScope("email");
  if (publicEnv.google.clientId) {
    provider.setCustomParameters({ client_id: publicEnv.google.clientId });
  }
  return provider;
}

export { getFirebaseApp };
