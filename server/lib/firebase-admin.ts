import * as admin from "firebase-admin";

let _app: admin.app.App | null = null;

function initAdminApp(): admin.app.App | null {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn("[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON not set — Admin SDK disabled");
    return null;
  }

  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccountJson));
    const databaseURL =
      process.env.FIREBASE_DATABASE_URL ||
      process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
    return admin.initializeApp({ credential, ...(databaseURL ? { databaseURL } : {}) });
  } catch (err) {
    console.error("[firebase-admin] Failed to initialize Admin SDK:", err);
    return null;
  }
}

export function getAdminApp(): admin.app.App | null {
  if (!_app) _app = initAdminApp();
  return _app;
}

export function getAdminDb(): admin.firestore.Firestore | null {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return admin.firestore(app);
  } catch {
    return null;
  }
}

export function getAdminAuth(): admin.auth.Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return admin.auth(app);
  } catch {
    return null;
  }
}

export { admin };
