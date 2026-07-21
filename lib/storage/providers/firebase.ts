// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE STORAGE PROVIDER — implements StorageAdapter using Firebase Storage.
// ───────────────────────────────────────────────────────────────────────────────
// This is the ONLY file that imports the Firebase Storage SDK.
// All other files use the adapter interface from lib/storage.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { StorageAdapter } from "../adapter";

// Firebase Storage download URLs follow the pattern:
//   https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?alt=media&token=...
const FIREBASE_STORAGE_HOST = "firebasestorage.googleapis.com";

export const firebaseStorageProvider: StorageAdapter = {
  async upload(path, file) {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  },

  async delete(path) {
    try {
      await deleteObject(ref(storage, path));
    } catch (error: any) {
      // "object-not-found" is acceptable — treat deletions as idempotent.
      if (error?.code !== "storage/object-not-found") {
        throw error;
      }
    }
  },

  getPathFromUrl(url) {
    try {
      const parsed = new URL(url);
      // pathname: /v0/b/{bucket}/o/{encoded-path}
      const match = parsed.pathname.match(/\/o\/(.+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
      return "";
    } catch {
      return "";
    }
  },

  isOwnUrl(url) {
    try {
      return new URL(url).hostname === FIREBASE_STORAGE_HOST;
    } catch {
      return false;
    }
  },
};
