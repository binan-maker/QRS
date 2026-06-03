import type { DbAdapter, RealtimeAdapter } from "./adapter";

/**
 * Detect whether we're running in a plain Node.js server process.
 * On React Native / browser, `document` is defined (or `navigator.product`
 * is "ReactNative"). On a Node.js server neither exists.
 */
function isServerEnvironment(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof (process as any).versions?.node === "string" &&
    typeof document === "undefined" &&
    typeof navigator === "undefined"
  );
}

function loadFirebaseDb(): DbAdapter {
  if (isServerEnvironment()) {
    // Server: use Firebase Admin SDK — bypasses security rules entirely.
    return require("./providers/firebase-admin-provider").adminDb;
  }
  return require("./providers/firebase").firebaseDb;
}

function loadFirebaseRtdb(): RealtimeAdapter {
  if (isServerEnvironment()) {
    return require("./providers/firebase-admin-provider").adminRtdb;
  }
  return require("./providers/firebase").firebaseRtdb;
}

export const db: DbAdapter = loadFirebaseDb();
export const rtdb: RealtimeAdapter = loadFirebaseRtdb();
