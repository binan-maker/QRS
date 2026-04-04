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

/**
 * Generate a unique ID for filenames
 */
function generateUniqueId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Upload an image to Firebase Storage
 * @param file - The image file to upload (Blob or File)
 * @param folder - The folder path in storage (e.g., 'profile-photos', 'qr-logos')
 * @param userId - Optional user ID for organizing files
 * @returns The download URL of the uploaded image
 */
export async function uploadImage(
  file: Blob | File,
  folder: string = "images",
  userId?: string
): Promise<string> {
  try {
    // Generate unique filename
    const extension = file.type.split("/")[1] || "jpg";
    const filename = `${userId || "anon"}_${generateUniqueId()}.${extension}`;
    
    // Create storage reference
    const storagePath = `${folder}/${filename}`;
    const storageRef: StorageReference = ref(storage, storagePath);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error: any) {
    console.error("[storage] uploadImage failed:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Upload a base64 image to Firebase Storage with automatic compression
 * @param base64Data - Base64 encoded image data (with or without data:image prefix)
 * @param folder - The folder path in storage
 * @param userId - Optional user ID for organizing files
 * @param compress - Whether to compress the image (default: true for profile photos)
 * @param maxWidth - Maximum width for compression (default: 400px for profile photos)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns The download URL of the uploaded image
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
    // Extract base64 data and mime type
    let base64String = base64Data;
    let mimeType = "image/jpeg";
    
    if (base64Data.includes(",")) {
      const parts = base64Data.split(",");
      mimeType = parts[0].match(/:(.*?);/)![1];
      base64String = parts[1];
    }
    
    // Convert base64 to Blob
    const response = await fetch(`data:${mimeType};base64,${base64String}`);
    let blob = await response.blob();
    
    // FIX #7: Compress image before upload if requested (for profile photos)
    if (compress && mimeType.startsWith("image/")) {
      blob = await compressImage(blob, maxWidth, quality);
    }
    
    // Upload the blob
    return await uploadImage(blob, folder, userId);
  } catch (error: any) {
    console.error("[storage] uploadBase64Image failed:", error);
    throw new Error(`Failed to upload base64 image: ${error.message}`);
  }
}

// FIX #7: Image compression helper to reduce storage and bandwidth costs
async function compressImage(
  blob: Blob,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            reject(new Error("Compression failed"));
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Create a reference from the URL
    const storageRef: StorageReference = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    // Ignore errors if file doesn't exist
    if (error.code !== "storage/object-not-found") {
      console.error("[storage] deleteImage failed:", error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }
}

/**
 * Get the storage path from a URL (for deletion purposes)
 * @param imageUrl - The download URL
 * @returns The storage path
 */
export function getStoragePathFromUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Upload profile photo with automatic cleanup of old photo
 * @param file - The new profile photo file
 * @param userId - User ID
 * @param oldPhotoUrl - Optional old photo URL to delete
 * @returns The download URL of the new photo
 */
export async function uploadProfilePhoto(
  file: Blob | File,
  userId: string,
  oldPhotoUrl?: string | null
): Promise<string> {
  try {
    // Delete old photo if exists
    if (oldPhotoUrl && oldPhotoUrl.includes("firebasestorage")) {
      await deleteImage(oldPhotoUrl).catch(() => {}); // Ignore errors
    }
    
    // Upload new photo
    return await uploadImage(file, "profile-photos", userId);
  } catch (error: any) {
    console.error("[storage] uploadProfilePhoto failed:", error);
    throw error;
  }
}

/**
 * Upload QR code logo with automatic cleanup of old logo
 * @param file - The new logo file
 * @param qrId - QR code ID
 * @param oldLogoUrl - Optional old logo URL to delete
 * @returns The download URL of the new logo
 */
export async function uploadQrLogo(
  file: Blob | File,
  qrId: string,
  oldLogoUrl?: string | null
): Promise<string> {
  try {
    // Delete old logo if exists
    if (oldLogoUrl && oldLogoUrl.includes("firebasestorage")) {
      await deleteImage(oldLogoUrl).catch(() => {}); // Ignore errors
    }
    
    // Upload new logo
    return await uploadImage(file, "qr-logos", qrId);
  } catch (error: any) {
    console.error("[storage] uploadQrLogo failed:", error);
    throw error;
  }
}
