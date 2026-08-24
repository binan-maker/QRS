import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: ReturnType<typeof initializeApp> | undefined;

function getAdminApp() {
  if (adminApp) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credential = raw ? cert(JSON.parse(raw)) : applicationDefault();
  adminApp = getApps().length ? getApps()[0] : initializeApp({ credential });
  return adminApp;
}

export async function verifySessionCookie(token: string) {
  try {
    return await getAuth(getAdminApp()).verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function deleteFirebaseUser(uid: string) {
  await getAuth(getAdminApp()).deleteUser(uid);
}