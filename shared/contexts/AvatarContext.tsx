/**
 * AvatarContext — centralised, zero-duplicate-fetch avatar store.
 *
 * Responsibilities:
 *  1. Persist the latest avatar URL + a version timestamp in AsyncStorage so the
 *     image is available synchronously on the next app launch (before any network call).
 *  2. Expose `cachedUrl` (url?v=<version>) so expo-image cache-busts ONLY when
 *     the photo actually changes — not on every navigation.
 *  3. Provide `setAvatar(url)` for optimistic updates after upload, and `syncAvatar(url)`
 *     for quiet background syncs (profile loads, login) that skip a version bump when
 *     the URL hasn't changed.
 *  4. `clearAvatar()` is called on sign-out so no stale data leaks across users.
 *  5. `isHydrated` becomes true once AsyncStorage has finished loading so consumers
 *     know whether an empty `url` means "not loaded yet" or "genuinely no photo".
 *  6. `syncAvatarFromOutside(url)` allows non-hook contexts (e.g. AuthContext) to
 *     push Firestore photo updates into this store without a React hook dependency.
 *
 * No new packages needed — Context + AsyncStorage + expo-image cachePolicy covers it.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  prefetchStartupPrefs,
  getStartupPref,
  isStartupPrefsLoaded,
  STARTUP_PREF_KEYS,
} from "@/lib/startup-prefs";
import { supabase, SUPABASE_TABLES, SUPABASE_BUCKETS } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { cacheAuthUser, getCachedAuthUser } from "@/lib/auth/session-cache";

export function isUserUploadedPhoto(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (
    trimmed.includes("googleusercontent.com") ||
    trimmed.includes("google.com") ||
    trimmed.includes("gstatic.com")
  ) {
    return false;
  }
  if (
    trimmed.includes("placeholder") ||
    trimmed.includes("default-avatar") ||
    trimmed.includes("ui-avatars.com")
  ) {
    return false;
  }
  return true;
}

export function pickBestPhotoUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c && typeof c === "string" && isUserUploadedPhoto(c)) {
      return c.trim();
    }
  }
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim().length > 0) {
      return c.trim();
    }
  }
  return null;
}

// Module-level ref populated by the provider so callers outside the hook tree
// (e.g. AuthContext queryFn callbacks) can sync the avatar without hooks.
let _syncFn: ((url: string | null) => void) | null = null;
// Separate ref for the clear operation — wired up alongside _syncFn.
let _clearFn: (() => void) | null = null;

/**
 * Call from non-hook contexts (AuthContext prefetchQuery, etc.) to push a
 * Supabase DB/Storage photo URL into AvatarContext without a React hook.
 * Safe to call before the provider mounts — it becomes a no-op in that case.
 */
export function syncAvatarFromOutside(url: string | null): void {
  _syncFn?.(url);
}

/**
 * Call from AuthContext.signOut() to clear the avatar from both React state
 * and AsyncStorage so no stale photo leaks to the next signed-in user.
 * Safe to call before the provider mounts — it becomes a no-op in that case.
 */
export function clearAvatarFromOutside(): void {
  _clearFn?.();
}

const AVATAR_URL_KEY = "qrg:avatar:url";
const AVATAR_VER_KEY = "qrg:avatar:version";
const CUSTOM_AVATAR_PREFIX = "user_custom_avatar_";
const USER_AVATAR_PREFIX = "user_avatar_";

function stripQuery(url: string): string {
  try {
    const idx = url.indexOf("?");
    return idx === -1 ? url : url.slice(0, idx);
  } catch {
    return url;
  }
}

interface AvatarState {
  url: string | null;
  version: number;
  cachedUrl: string | null;
  /** True once AsyncStorage + DB avatar check has finished loading. */
  isHydrated: boolean;
  setAvatar: (url: string) => void;
  syncAvatar: (url: string | null) => void;
  clearAvatar: () => void;
}

const AvatarContext = createContext<AvatarState>({
  url: null,
  version: 0,
  cachedUrl: null,
  isHydrated: false,
  setAvatar: () => {},
  syncAvatar: () => {},
  clearAvatar: () => {},
});

export function AvatarProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  // ── Synchronous initialisation from startup-prefs cache ──────────────────
  const [url, setUrl] = useState<string | null>(() =>
    isStartupPrefsLoaded() ? getStartupPref(STARTUP_PREF_KEYS.AVATAR_URL) : null
  );
  const [version, setVersion] = useState<number>(() => {
    if (!isStartupPrefsLoaded()) return 0;
    const v = getStartupPref(STARTUP_PREF_KEYS.AVATAR_VERSION);
    return v ? Number(v) : 0;
  });
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    if (isStartupPrefsLoaded()) return;
    prefetchStartupPrefs()
      .then(() => {
        const storedUrl = getStartupPref(STARTUP_PREF_KEYS.AVATAR_URL);
        const storedVer = getStartupPref(STARTUP_PREF_KEYS.AVATAR_VERSION);
        if (storedUrl) {
          setUrl((prev) => (prev && isUserUploadedPhoto(prev) ? prev : storedUrl));
        }
        if (storedVer) setVersion(Number(storedVer));
      })
      .catch(() => {});
  }, []);

  // ── Authoritative Supabase DB & Storage resolution (matches Web's avatar-context.tsx) ──
  useEffect(() => {
    let active = true;

    if (!userId) {
      setIsHydrated(true);
      return;
    }

    const customKey = `${CUSTOM_AVATAR_PREFIX}${userId}`;
    const userKey = `${USER_AVATAR_PREFIX}${userId}`;

    const resolveAvatarFromSupabase = async () => {
      try {
        // 1. Hydrate from user-specific AsyncStorage keys immediately
        const pairs = await AsyncStorage.multiGet([customKey, userKey]);
        const localCustom = pairs[0]?.[1] || null;
        const localUser = pairs[1]?.[1] || null;
        const bestLocal = pickBestPhotoUrl(localCustom, localUser);
        if (bestLocal && active) {
          setUrl((prev) => {
            if (prev && isUserUploadedPhoto(prev) && !isUserUploadedPhoto(bestLocal)) {
              return prev;
            }
            return bestLocal;
          });
        }

        // 2. Fetch authoritative photo from public.users in Supabase
        const { data } = await supabase
          .from(SUPABASE_TABLES.USERS)
          .select("photo_url, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (!active) return;

        let dbPhoto = pickBestPhotoUrl(data?.photo_url, data?.avatar_url);

        // 3. Self-heal if public.users has a Google default URL (or missing custom photo)
        //    while the user actually has a custom uploaded photo in auth metadata or Supabase Storage `avatars/{userId}/`
        if (!isUserUploadedPhoto(dbPhoto)) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const meta = sessionData?.session?.user?.user_metadata;
            const metaCustom = pickBestPhotoUrl(
              isUserUploadedPhoto(meta?.custom_avatar_url) ? meta?.custom_avatar_url : null,
              isUserUploadedPhoto(meta?.photo_url) ? meta?.photo_url : null,
              isUserUploadedPhoto(meta?.avatar_url) ? meta?.avatar_url : null
            );
            if (metaCustom) {
              dbPhoto = metaCustom;
            } else {
              const { data: files } = await supabase.storage
                .from(SUPABASE_BUCKETS.AVATARS)
                .list(userId, {
                  limit: 10,
                  sortBy: { column: "created_at", order: "desc" },
                });
              const validFile = Array.isArray(files)
                ? files.find(
                    (f) =>
                      f.name &&
                      !f.name.startsWith(".") &&
                      f.name !== ".emptyFolderPlaceholder"
                  )
                : null;
              if (validFile?.name) {
                const { data: pubData } = supabase.storage
                  .from(SUPABASE_BUCKETS.AVATARS)
                  .getPublicUrl(`${userId}/${validFile.name}`);
                if (pubData?.publicUrl) {
                  dbPhoto = pubData.publicUrl;
                }
              }
            }

            // If we recovered a user-uploaded photo from Storage/metadata, repair public.users
            if (dbPhoto && isUserUploadedPhoto(dbPhoto) && data) {
              void supabase
                .from(SUPABASE_TABLES.USERS)
                .update({
                  photo_url: dbPhoto,
                  avatar_url: dbPhoto,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", userId);
            }
          } catch {}
        }

        if (!active) return;

        if (dbPhoto) {
          setUrl((prev) => {
            if (prev === null || stripQuery(prev) !== stripQuery(dbPhoto!)) {
              const v = Date.now();
              setVersion(v);
              const pairsToSave: [string, string][] = [
                [AVATAR_URL_KEY, dbPhoto!],
                [AVATAR_VER_KEY, String(v)],
                [userKey, dbPhoto!],
              ];
              if (isUserUploadedPhoto(dbPhoto)) {
                pairsToSave.push([customKey, dbPhoto!]);
              }
              AsyncStorage.multiSet(pairsToSave).catch(() => {});
            }
            return dbPhoto!;
          });

          // Keep Zustand auth store and cached auth snapshot synced with authoritative photo
          const currentStoreUser = useAuthStore.getState().user;
          if (currentStoreUser && currentStoreUser.id === userId && currentStoreUser.photoURL !== dbPhoto) {
            const updatedUser = { ...currentStoreUser, photoURL: dbPhoto };
            useAuthStore.getState().setUser(updatedUser);
            cacheAuthUser(updatedUser);
          } else {
            const cachedUser = getCachedAuthUser();
            if (cachedUser && cachedUser.id === userId && cachedUser.photoURL !== dbPhoto) {
              cacheAuthUser({ ...cachedUser, photoURL: dbPhoto });
            }
          }
        } else if (data && data.photo_url === null && data.avatar_url === null) {
          // User explicitly removed or does not have a photo in DB
          setUrl(null);
          AsyncStorage.multiRemove([AVATAR_URL_KEY, customKey, userKey]).catch(() => {});
        }
      } catch {
        // Ignore network errors — keep cached avatar
      } finally {
        if (active) setIsHydrated(true);
      }
    };

    void resolveAvatarFromSupabase();

    return () => {
      active = false;
    };
  }, [userId]);

  const setAvatar = useCallback(
    (newUrl: string) => {
      const v = Date.now();
      setUrl(newUrl);
      setVersion(v);
      const pairs: [string, string][] = [
        [AVATAR_URL_KEY, newUrl],
        [AVATAR_VER_KEY, String(v)],
      ];
      const currentUid = useAuthStore.getState().user?.id;
      if (currentUid) {
        pairs.push([`${USER_AVATAR_PREFIX}${currentUid}`, newUrl]);
        if (isUserUploadedPhoto(newUrl)) {
          pairs.push([`${CUSTOM_AVATAR_PREFIX}${currentUid}`, newUrl]);
        }
      }
      AsyncStorage.multiSet(pairs).catch(() => {});
    },
    []
  );

  const syncAvatar = useCallback((newUrl: string | null) => {
    if (!newUrl) return;
    setUrl((prev) => {
      // Never allow a default Google photo to overwrite an already-loaded custom uploaded photo
      if (prev !== null && isUserUploadedPhoto(prev) && !isUserUploadedPhoto(newUrl)) {
        return prev;
      }
      if (prev !== null && stripQuery(prev) === stripQuery(newUrl)) return prev;
      const v = Date.now();
      setVersion(v);
      const pairs: [string, string][] = [
        [AVATAR_URL_KEY, newUrl],
        [AVATAR_VER_KEY, String(v)],
      ];
      const currentUid = useAuthStore.getState().user?.id;
      if (currentUid) {
        pairs.push([`${USER_AVATAR_PREFIX}${currentUid}`, newUrl]);
        if (isUserUploadedPhoto(newUrl)) {
          pairs.push([`${CUSTOM_AVATAR_PREFIX}${currentUid}`, newUrl]);
        }
      }
      AsyncStorage.multiSet(pairs).catch(() => {});
      return newUrl;
    });
  }, []);

  const clearAvatar = useCallback(() => {
    setUrl(null);
    setVersion(0);
    const keys = [AVATAR_URL_KEY, AVATAR_VER_KEY];
    const currentUid = useAuthStore.getState().user?.id;
    if (currentUid) {
      keys.push(`${CUSTOM_AVATAR_PREFIX}${currentUid}`, `${USER_AVATAR_PREFIX}${currentUid}`);
    }
    AsyncStorage.multiRemove(keys).catch(() => {});
  }, []);

  // Wire up the module-level refs so AuthContext (and other non-hook callers)
  // can call syncAvatarFromOutside() and clearAvatarFromOutside() at any time.
  useEffect(() => {
    _syncFn = syncAvatar;
    _clearFn = clearAvatar;
    return () => {
      _syncFn = null;
      _clearFn = null;
    };
  }, [syncAvatar, clearAvatar]);

  const cachedUrl = useMemo(() => {
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    return version ? `${url}${url.includes("?") ? "&" : "?"}v=${version}` : url;
  }, [url, version]);

  const contextValue = useMemo(
    () => ({ url, version, cachedUrl, isHydrated, setAvatar, syncAvatar, clearAvatar }),
    [url, version, cachedUrl, isHydrated, setAvatar, syncAvatar, clearAvatar]
  );

  return (
    <AvatarContext.Provider value={contextValue}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  return useContext(AvatarContext);
}
