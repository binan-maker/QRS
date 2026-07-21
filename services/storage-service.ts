// ─── Storage Service ──────────────────────────────────────────────────────────
// Handles image uploads and downloads through the provider-agnostic StorageAdapter.
// No Firebase SDK is imported here — swap providers in lib/storage/index.ts only.

import { storageAdapter } from "@/lib/storage";

/**
 * Extract the internal storage path from a provider-issued download URL.
 * Returns an empty string when the URL cannot be parsed.
 */
export function getStoragePathFromUrl(imageUrl: string): string {
  return storageAdapter.getPathFromUrl(imageUrl);
}

/**
 * Delete an image given its download URL.
 * Silently ignores missing files.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    const path = storageAdapter.getPathFromUrl(imageUrl);
    if (!path) return;
    await storageAdapter.delete(path);
  } catch (error: any) {
    console.error("[storage] deleteImage failed:", error);
  }
}

/**
 * Upload an image blob to storage.
 * Stores files at: {folder}/{userId}/{timestamp_random}.ext
 */
export async function uploadImage(
  file: Blob | File,
  folder: string = "images",
  userId?: string
): Promise<string> {
  try {
    const extension = (file.type || "image/jpeg").split("/")[1] || "jpg";
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}.${extension}`;
    const storagePath = `${folder}/${userId || "anon"}/${filename}`;
    return await storageAdapter.upload(storagePath, file);
  } catch (error: any) {
    console.error("[storage] uploadImage failed:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload a base64 image to storage.
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
 * Upload a new profile photo and delete the old one atomically.
 * New upload succeeds first — failure never leaves the user without a photo.
 *
 * Security: the old file is only deleted when its path contains
 * `profile-photos/{userId}/`, preventing accidental cross-user deletions.
 */
export async function uploadProfilePhoto(
  file: Blob | File,
  userId: string,
  oldPhotoUrl?: string | null
): Promise<string> {
  // 1. Upload new photo first
  const newUrl = await uploadImage(file, "profile-photos", userId);

  // 2. Fire-and-forget cleanup of the old photo
  if (oldPhotoUrl && storageAdapter.isOwnUrl(oldPhotoUrl)) {
    const oldPath = storageAdapter.getPathFromUrl(oldPhotoUrl);
    if (oldPath && oldPath.includes(`profile-photos/${userId}/`)) {
      deleteImage(oldPhotoUrl).catch((err) =>
        console.warn("[storage] old photo cleanup failed (non-blocking):", err)
      );
    }
  }

  return newUrl;
}

/**
 * Delete a user's current profile photo from storage.
 * Security: validates the path belongs to the user before deleting.
 */
export async function deleteProfilePhoto(
  userId: string,
  photoUrl: string
): Promise<void> {
  if (!storageAdapter.isOwnUrl(photoUrl)) return;
  const path = storageAdapter.getPathFromUrl(photoUrl);
  if (!path || !path.includes(`profile-photos/${userId}/`)) {
    console.warn("[storage] deleteProfilePhoto: path mismatch, skipping", { userId, path });
    return;
  }
  await deleteImage(photoUrl);
}

/**
 * Upload a QR code logo with automatic cleanup of the old logo.
 */
export async function uploadQrLogo(
  file: Blob | File,
  qrId: string,
  oldLogoUrl?: string | null
): Promise<string> {
  try {
    if (oldLogoUrl && storageAdapter.isOwnUrl(oldLogoUrl)) {
      deleteImage(oldLogoUrl).catch(() => {});
    }
    return await uploadImage(file, "qr-logos", qrId);
  } catch (error: any) {
    console.error("[storage] uploadQrLogo failed:", error);
    throw error;
  }
}
