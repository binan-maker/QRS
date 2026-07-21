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
// SECURITY FIX P2: Firebase App Check — verifies that calls to Firebase
// services come from your authentic app (web only via reCAPTCHA v3).
// Native enforcement requires @react-native-firebase/app-check, which needs
// a custom dev client; not enabled here to keep the Expo managed workflow
// portable. Web is the larger attack surface anyway.
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

// ─── Lazy services ──────────────────────────────────────────────────────────
// RealtimeDB and Storage are NOT needed during startup. Deferring their
// initialisation removes one persistent WebSocket connection (RTDB) and one
// SDK object allocation from the cold-start critical path. They are created
// on first actual use — which happens well after the Home screen is interactive.

let _realtimeDB: ReturnType<typeof getDatabase> | null = null;
export function getRealtimeDB(): ReturnType<typeof getDatabase> {
  if (!_realtimeDB) _realtimeDB = getDatabase(firebaseApp);
  return _realtimeDB;
}

let _storageInstance: ReturnType<typeof getStorage> | null = null;
export function getStorageInstance(): ReturnType<typeof getStorage> {
  if (!_storageInstance) _storageInstance = getStorage(firebaseApp);
  return _storageInstance;
}

// ─── App Check (web only) ──────────────────────────────────────────────────
// Activated when EXPO_PUBLIC_RECAPTCHA_SITE_KEY is set. On native we silently
// skip — there is no first-party path in the firebase-js-sdk.
// Set EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN=1 in dev to use a debug token.
if (Platform.OS === "web" && typeof window !== "undefined") {
  const siteKey = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    try {
      if (process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN) {
        // Allow Firebase to print a debug token to the console for local dev.
        // (Must be set BEFORE initializeAppCheck — see Firebase docs.)
        (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (e) {
      // App Check failure must NEVER break app init — it's defense in depth.
      // eslint-disable-next-line no-console
      console.warn("[AppCheck] Initialization failed:", e);
    }
  }
}