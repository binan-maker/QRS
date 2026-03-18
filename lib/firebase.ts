import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// ─── Firebase Configuration ────────────────────────────────────────────────
// Set these in your .env file as EXPO_PUBLIC_FIREBASE_* variables.
// The fallbacks below allow development without an .env file.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyClEPO1EIRG3vxbQgS6l9AdZj0dIt765e0",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "scan-guard-19a7f",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "scan-guard-19a7f.firebasestorage.app",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://scan-guard-19a7f-default-rtdb.asia-southeast1.firebasedatabase.app",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:971359442211:android:96d2747d81b499102fa896",
  messagingSenderId: "971359442211",
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
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

// ─── Firestore ──────────────────────────────────────────────────────────────
// Web: persistent multi-tab cache — reduces reads & works offline.
// Native: memory cache (IndexedDB not available in React Native).
function buildFirestore() {
  try {
    if (Platform.OS === "web") {
      return initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    }
    return initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const firebaseAuth = buildAuth();
export const firestore = buildFirestore();
export const realtimeDB = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
