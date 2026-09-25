import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function readEnv(name: string) {
  return process.env[name] ?? "";
}

function getFirebaseApp() {
  const config = {
    apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error(
      "Web Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* variables in Replit."
    );
  }

  return getApps().length ? getApp() : initializeApp(config);
}

export function getWebAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getWebDb(): Firestore {
  return getFirestore(getFirebaseApp());
}