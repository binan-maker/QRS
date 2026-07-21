// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION — single source of truth for Firebase project metadata.
// ───────────────────────────────────────────────────────────────────────────────
// Firebase SDK initialization lives in lib/firebase.ts.
// This file exports typed config values that are safe to reference in
// non-SDK contexts (e.g. REST calls, server-side lookups, deep link generation).
//
// All values are sourced from EXPO_PUBLIC_* environment variables and are
// visible in the JavaScript bundle by design — Firebase client config is
// public and protected by Firebase App Check + Security Rules.
// ═══════════════════════════════════════════════════════════════════════════════

export const FIREBASE_CONFIG = {
  /** Firebase project ID — used in Firestore REST URLs and Admin SDK init. */
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",

  /** Firebase API key — used for Firebase REST API calls only. Not a secret. */
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",

  /** Firebase Storage bucket (without gs:// prefix). */
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",

  /** Firebase Realtime Database URL. */
  databaseUrl: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "",

  /** Firebase app ID — used for analytics and App Check. */
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",

  /** Firebase messaging sender ID — used for FCM. */
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
} as const;

/**
 * Build a Firestore REST URL for a document.
 *
 * @example
 *   firestoreDocUrl("users", uid)
 *   // → "https://firestore.googleapis.com/v1/projects/my-project/databases/(default)/documents/users/uid123?key=..."
 */
export function firestoreDocUrl(collection: string, docId: string): string {
  return (
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}` +
    `/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}` +
    `?key=${FIREBASE_CONFIG.apiKey}`
  );
}

/**
 * Build a Firestore REST commit URL for batch writes.
 */
export function firestoreCommitUrl(): string {
  return (
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}` +
    `/databases/(default)/documents:commit?key=${FIREBASE_CONFIG.apiKey}`
  );
}

/**
 * Build a Firestore document path string (used inside commit payloads).
 */
export function firestoreDocPath(collection: string, docId: string): string {
  return (
    `projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents` +
    `/${collection}/${encodeURIComponent(docId)}`
  );
}
