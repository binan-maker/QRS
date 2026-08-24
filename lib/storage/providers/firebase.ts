import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseApp } from "@/lib/firebase";
import type { StorageAdapter } from "../adapter";

const storage = () => getStorage(getFirebaseApp());

export const firebaseStorageProvider: StorageAdapter = {
  async upload(path, file) {
    const objectRef = ref(storage(), path);
    await uploadBytes(objectRef, file);
    return getDownloadURL(objectRef);
  },
  async delete(path) {
    try {
      await deleteObject(ref(storage(), path));
    } catch (error: any) {
      if (error?.code !== "storage/object-not-found") throw error;
    }
  },
  getPathFromUrl(url) {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/o\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : "";
    } catch {
      return "";
    }
  },
  isOwnUrl(url) {
    try {
      const host = new URL(url).hostname;
      return host === "firebasestorage.googleapis.com" || host.endsWith(".firebasestorage.app");
    } catch {
      return false;
    }
  },
};