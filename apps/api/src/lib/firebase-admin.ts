import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;
let db: Firestore | undefined;

function getAppInstance() {
  if (app) return app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  try {
    const credential = raw ? cert(JSON.parse(raw)) : applicationDefault();
    app = getApps().length ? getApps()[0] : initializeApp({ credential });
    return app;
  } catch (error) {
    console.error("[firebase-admin] Unable to initialize Admin SDK:", error);
    return null;
  }
}

export function getAdminDb() {
  const instance = getAppInstance();
  if (!instance) return null;
  if (!db) db = getFirestore(instance);
  return db;
}

export function getAdminAuth() {
  const instance = getAppInstance();
  return instance ? getAuth(instance) : null;
}

export async function verifyFirebaseToken(token: string) {
  const auth = getAdminAuth();
  return auth ? auth.verifyIdToken(token) : null;
}

export async function deleteFirebaseUser(uid: string) {
  const auth = getAdminAuth();
  if (!auth) throw new Error("Firebase Admin is not configured");
  await auth.deleteUser(uid);
}

export const admin = {
  firestore: {
    FieldValue,
    Timestamp,
  },
  auth: () => getAdminAuth(),
};