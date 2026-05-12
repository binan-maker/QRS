// ─── Firebase Storage Service ────────────────────────────────────────────────
// Handles image uploads and downloads using Firebase Storage.
// This reduces Firestore costs by storing only URLs instead of base64 data.

import { storage } from "../firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type StorageReference,
} from "firebase/storage";

function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract the Firebase Storage path from a download URL.
 * Firebase download URLs have the form:
 *   https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?alt=media&token=...
 * The path segment is in pathname (everything after /o/), URL-encoded.
 */
export function getStoragePathFromUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    // pathname ends at the '?' so we just grab everything after /o/
    const match = url.pathname.match(/\/o\/(.+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Delete an image from Firebase Storage given its download URL.
 * Silently ignores "object not found" errors.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Must use the storage path, NOT the full download URL, to build a valid ref.
    const path = getStoragePathFromUrl(imageUrl);
    if (!path) return;
    const storageRef: StorageReference = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: any) {
    if (error?.code !== "storage/object-not-found") {
      console.error("[storage] deleteImage failed:", error);
    }
  }
}

/**
 * Upload an image blob to Firebase Storage.
 * Stores files at: {folder}/{userId}/{timestamp_random}.ext
 */
export async function uploadImage(
  file: Blob | File,
  folder: string = "images",
  userId?: string
): Promise<string> {
  try {
    const extension = (file.type || "image/jpeg").split("/")[1] || "jpg";
    const filename = `${generateUniqueId()}.${extension}`;
    const storagePath = `${folder}/${userId || "anon"}/${filename}`;
    const storageRef: StorageReference = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    console.error("[storage] uploadImage failed:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload a base64 image to Firebase Storage.
 */
export async function uploadBase64Image(
  base64Data: string,
  folder: string = "images",
  userId?: string,
  compress: boolean = false,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<string> {
  try {
    let base64String = base64Data;
    let mimeType = "image/jpeg";

    if (base64Data.includes(",")) {
      const parts = base64Data.split(",");
      mimeType = parts[0].match(/:(.*?);/)![1];
      base64String = parts[1];
    }

    const response = await fetch(`data:${mimeType};base64,${base64String}`);
    let blob = await response.blob();

    if (compress && mimeType.startsWith("image/")) {
      blob = await compressImage(blob, maxWidth, quality);
    }

    return await uploadImage(blob, folder, userId);
  } catch (error: any) {
    console.error("[storage] uploadBase64Image failed:", error);
    throw new Error(`Failed to upload base64 image: ${error.message}`);
  }
}

async function compressImage(blob: Blob, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Could not get canvas context")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (compressed) => compressed ? resolve(compressed) : reject(new Error("Compression failed")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Upload a new profile photo and delete the old one (if it was a user-owned
 * Firebase Storage file).  The new upload happens first so a failure never
 * leaves the user with no photo.
 *
 * Security: the old file is only deleted when its storage path contains
 * `profile-photos/{userId}/`, preventing accidental cross-user deletions.
 */
export async function uploadProfilePhoto(
  file: Blob | File,
  userId: string,
  oldPhotoUrl?: string | null
): Promise<string> {
  // 1. Upload new photo first
  const newUrl = await uploadImage(file, "profile-photos", userId);

  // 2. Fire-and-forget cleanup of the old photo (don't block the return value)
  if (oldPhotoUrl && oldPhotoUrl.includes("firebasestorage")) {
    const oldPath = getStoragePathFromUrl(oldPhotoUrl);
    if (oldPath && oldPath.includes(`profile-photos/${userId}/`)) {
      deleteImage(oldPhotoUrl).catch((err) =>
        console.warn("[storage] old photo cleanup failed (non-blocking):", err)
      );
    }
  }

  return newUrl;
}

/**
 * Delete a user's current profile photo from Storage.
 * Security: validates the path belongs to the user before deleting.
 */
export async function deleteProfilePhoto(
  userId: string,
  photoUrl: string
): Promise<void> {
  if (!photoUrl.includes("firebasestorage")) return;
  const path = getStoragePathFromUrl(photoUrl);
  if (!path || !path.includes(`profile-photos/${userId}/`)) {
    console.warn("[storage] deleteProfilePhoto: path mismatch, skipping", { userId, path });
    return;
  }
  await deleteImage(photoUrl);
}

/**
 * Upload QR code logo with automatic cleanup of old logo.
 */
export async function uploadQrLogo(
  file: Blob | File,
  qrId: string,
  oldLogoUrl?: string | null
): Promise<string> {
  try {
    if (oldLogoUrl && oldLogoUrl.includes("firebasestorage")) {
      deleteImage(oldLogoUrl).catch(() => {});
    }
    return await uploadImage(file, "qr-logos", qrId);
  } catch (error: any) {
    console.error("[storage] uploadQrLogo failed:", error);
    throw error;
  }
}
