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

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Module-level ref populated by the provider so callers outside the hook tree
// (e.g. AuthContext queryFn callbacks) can sync the avatar without hooks.
let _syncFn: ((url: string | null) => void) | null = null;

/**
 * Call from non-hook contexts (AuthContext prefetchQuery, etc.) to push a
 * Firestore/Storage photo URL into AvatarContext without a React hook.
 * Safe to call before the provider mounts — it becomes a no-op in that case.
 */
export function syncAvatarFromOutside(url: string | null): void {
  _syncFn?.(url);
}

const AVATAR_URL_KEY = "qrg:avatar:url";
const AVATAR_VER_KEY = "qrg:avatar:version";

// Firebase Storage download URLs contain an expiring `token=xxx` query param
// that the SDK rotates periodically.  Stripping query params before comparing
// lets us treat the same underlying file as the same photo regardless of which
// token is embedded in the URL — preventing spurious version bumps that cause
// the avatar Image component to reload on every auth cycle.
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
  /** True once AsyncStorage has finished loading. Use to distinguish "no photo" from "not loaded yet". */
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

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet([AVATAR_URL_KEY, AVATAR_VER_KEY]).then((pairs) => {
      const storedUrl = pairs[0][1];
      const storedVer = pairs[1][1];
      if (storedUrl) setUrl(storedUrl);
      if (storedVer) setVersion(Number(storedVer));
      setIsHydrated(true);
    }).catch(() => {
      setIsHydrated(true);
    });
  }, []);

  const setAvatar = useCallback((newUrl: string) => {
    const v = Date.now();
    setUrl(newUrl);
    setVersion(v);
    AsyncStorage.multiSet([
      [AVATAR_URL_KEY, newUrl],
      [AVATAR_VER_KEY, String(v)],
    ]).catch(() => {});
  }, []);

  const syncAvatar = useCallback((newUrl: string | null) => {
    if (!newUrl) return;
    setUrl((prev) => {
      // Compare base paths only — Firebase Storage tokens rotate on every auth
      // refresh, so the same file can arrive with a different ?token= param.
      // Treating that as a new photo would bump the version and force a reload.
      if (prev !== null && stripQuery(prev) === stripQuery(newUrl)) return prev;
      const v = Date.now();
      setVersion(v);
      AsyncStorage.multiSet([
        [AVATAR_URL_KEY, newUrl],
        [AVATAR_VER_KEY, String(v)],
      ]).catch(() => {});
      return newUrl;
    });
  }, []);

  const clearAvatar = useCallback(() => {
    setUrl(null);
    setVersion(0);
    AsyncStorage.multiRemove([AVATAR_URL_KEY, AVATAR_VER_KEY]).catch(() => {});
  }, []);

  // Wire up the module-level ref so AuthContext (and other non-hook callers)
  // can call syncAvatarFromOutside() at any time.
  useEffect(() => {
    _syncFn = syncAvatar;
    return () => { _syncFn = null; };
  }, [syncAvatar]);

  const cachedUrl = useMemo(() => (url ? `${url}?v=${version}` : null), [url, version]);

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
