import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth, getReactNativePersistence, GoogleAuthProvider } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FIREBASE_CONFIG } from "@/config/firebase";

let app: any;
let auth: any;

export function getFirebaseApp() {
  if (!app) app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  return app;
}

export function getFirebaseAuth() {
  if (!auth) {
    try {
      auth = initializeAuth(getFirebaseApp(), { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      auth = getAuth(getFirebaseApp());
    }
  }
  return auth;
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export function isFirebaseConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
}

export { GoogleAuthProvider };