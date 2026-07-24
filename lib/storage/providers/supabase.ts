// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE STORAGE PROVIDER — implements StorageAdapter using Supabase Storage.
// ───────────────────────────────────────────────────────────────────────────────
// This is the ONLY file that imports the Supabase Storage SDK.
// All other files use the adapter interface from lib/storage.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from "@/lib/supabase";
import type { StorageAdapter } from "../adapter";

// Default bucket — create this in your Supabase project dashboard.
// Go to Storage → New bucket → Name: "binro-assets" → Public: true
const DEFAULT_BUCKET = "binro-assets";

// Supabase Storage CDN URLs follow the pattern:
//   https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
const SUPABASE_STORAGE_HOST_PATTERN = /\.supabase\.co$/;

export const supabaseStorageProvider: StorageAdapter = {
  async upload(path, file) {
    const { error } = await supabase.storage.from(DEFAULT_BUCKET).upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    if (error) throw error;

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
      return SUPABASE_STORAGE_HOST_PATTERN.test(new URL(url).hostname);
    } catch {
      return false;
    }
  },
};
