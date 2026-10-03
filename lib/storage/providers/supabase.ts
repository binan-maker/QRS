// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE STORAGE PROVIDER — implements StorageAdapter using Supabase Storage.
// ───────────────────────────────────────────────────────────────────────────────
// This is the ONLY file that imports the Supabase Storage SDK.
// All other files use the adapter interface from lib/storage.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import type { StorageAdapter, UploadOptions, UploadableData } from "../adapter";

// Generic app uploads use the avatars bucket. Feature-specific callers use
// paths such as qr-logos/{userId}/... and can be migrated independently.
const DEFAULT_BUCKET = "avatars";

// Supabase Storage CDN URLs follow the pattern:
//   https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
const SUPABASE_STORAGE_HOST_PATTERN = /\.supabase\.co$/;

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const supabaseStorageProvider: StorageAdapter = {
  async upload(path: string, file: UploadableData, options?: UploadOptions) {
    let body: any = file;
    let contentType = options?.contentType;

    if (!contentType) {
      const ext = path.split(".").pop()?.toLowerCase();
      contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    }

    if (typeof file === "string") {
      let base64 = file;
      if (file.includes(",")) {
        const parts = file.split(",");
        const match = parts[0].match(/:(.*?);/);
        if (match) contentType = match[1];
        base64 = parts[1];
      }
      body = decodeBase64ToArrayBuffer(base64);
    } else if (file instanceof Uint8Array) {
      body = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    } else if (file instanceof ArrayBuffer) {
      body = file;
    } else if (typeof Blob !== "undefined" && file instanceof Blob) {
      // In React Native environments, sending raw Blob via fetch throws "Network request failed".
      // Converting to an ArrayBuffer ensures safe network serialization.
      if (typeof file.arrayBuffer === "function") {
        try {
          body = await file.arrayBuffer();
        } catch {
          body = file;
        }
      }
      if (file.type) contentType = file.type;
    }

    // 1. Upload to Supabase Storage
    let { error } = await supabase.storage.from(DEFAULT_BUCKET).upload(path, body, {
      upsert: true,
      cacheControl: options?.cacheControl || "3600",
      contentType,
    });

    // 2. If bucket is missing, attempt to create it and retry once
    if (
      error &&
      (error.message?.toLowerCase().includes("bucket not found") || (error as any).statusCode === "404")
    ) {
      try {
        await supabase.storage.createBucket(DEFAULT_BUCKET, { public: true });
        const retry = await supabase.storage.from(DEFAULT_BUCKET).upload(path, body, {
          upsert: true,
          cacheControl: options?.cacheControl || "3600",
          contentType,
        });
        error = retry.error;
      } catch {}
    }

    if (error) {
      console.warn("[storage] Supabase upload failed:", error.message);
      throw error;
    }

    const { data } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async delete(path) {
    try {
      const { error } = await supabase.storage.from(DEFAULT_BUCKET).remove([path]);
      // Treat "not found" as success — deletions are idempotent.
      if (error && !error.message?.includes("not found")) {
        throw error;
      }
    } catch (err: any) {
      if (!err?.message?.includes("not found")) throw err;
    }
  },

  getPathFromUrl(url) {
    try {
      const parsed = new URL(url);
      // Path: /storage/v1/object/public/<bucket>/<file-path>
      const match = parsed.pathname.match(/\/object\/public\/[^/]+\/(.+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
      return "";
    } catch {
      return "";
    }
  },

  isOwnUrl(url) {
    try {
      if (url.startsWith("data:image/")) return true;
      return SUPABASE_STORAGE_HOST_PATTERN.test(new URL(url).hostname);
    } catch {
      return false;
    }
  },
};
