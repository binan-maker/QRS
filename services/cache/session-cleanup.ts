// ── Application Session & Cache Cleanup Coordinator ──────────────────────────
// Consolidates teardown of all in-memory, query client, and persistent caches
// upon user sign-out or session invalidation, preserving clear boundary separation.

import { clearAllMemCache, clearAllAsyncStorageCache } from "./qr-cache";
import { clearAllAnonymousSessions } from "./anonymous-session";
import { clearPrewarmState } from "./prewarm";
import { clearUserProfileCache } from "../user/cache";
import { clearCommentProfileCache } from "../comments/cache";
import { clearAvatarFromOutside } from "@/shared/contexts/AvatarContext";

/**
 * Synchronously clears all active in-memory caches, user profiles, and avatar
 * state so subsequent renders immediately reflect an unauthenticated state.
 */
export function clearImmediateSessionCaches(): void {
  try {
    clearAllMemCache();
  } catch {}
  try {
    clearUserProfileCache();
  } catch {}
  try {
    clearCommentProfileCache();
  } catch {}
  try {
    clearPrewarmState();
  } catch {}
  try {
    clearAllAnonymousSessions();
  } catch {}
  try {
    clearAvatarFromOutside();
  } catch {}
}

/**
 * Asynchronously clears persisted AsyncStorage caches belonging to the signed-out
 * user (scan history, cached QR content blobs, and local download keys).
 */
export async function clearPersistentSessionCaches(signedOutUserId?: string | null): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    if (signedOutUserId) {
      await AsyncStorage.removeItem(`local_scan_history_${signedOutUserId}`).catch(() => {});
    }
    const allKeys = await AsyncStorage.getAllKeys().catch(() => []);
    const qrContentKeys = allKeys.filter((k) => k.startsWith("qr_content_"));
    if (qrContentKeys.length > 0) {
      await AsyncStorage.multiRemove(qrContentKeys).catch(() => {});
    }
    await AsyncStorage.removeItem("qrguard_downloads_dir_uri").catch(() => {});
  } catch {}

  await clearAllAsyncStorageCache().catch(() => {});
}

/**
 * Full session teardown: executes immediate in-memory wipe and triggers
 * background persistent cache cleanup.
 */
export function clearAppSessionData(signedOutUserId?: string | null): void {
  clearImmediateSessionCaches();
  clearPersistentSessionCaches(signedOutUserId).catch(() => {});
}
