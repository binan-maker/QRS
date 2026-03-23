import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// ─── Firebase Configuration ────────────────────────────────────────────────
// All values are read from environment variables (EXPO_PUBLIC_FIREBASE_*).
// For local development, copy .env.example to .env and fill in your values.
// For Replit / CI, set the variables in the Secrets panel.
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

// ─── App (singleton — hot-reload safe) ─────────────────────────────────────
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── Auth ───────────────────────────────────────────────────────────────────
// Native: uses AsyncStorage so auth survives restarts.
// Web: uses the default browser persistence.
function buildAuth() {
  if (Platform.OS === "web") {
    return getAuth(firebaseApp);
  }
  try {
    // Top-level import path avoids dynamic-require issues on some Metro versions
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorageModule = require("@react-native-async-storage/async-storage");
    const AsyncStorage = AsyncStorageModule.default ?? AsyncStorageModule;
    if (!AsyncStorage) return getAuth(firebaseApp);
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

// ─── Firestore ──────────────────────────────────────────────────────────────
// Use memoryLocalCache on all platforms.
// persistentLocalCache (IndexedDB) is unreliable inside iframes (e.g. Replit
// preview, web views) and causes Firestore queries to silently fail.
// experimentalForceLongPolling is removed — it slows connections and is
// unnecessary now that network detection no longer blocks the app.
function buildFirestore() {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const firebaseAuth = buildAuth();
export const firestore = buildFirestore();
export const realtimeDB = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
