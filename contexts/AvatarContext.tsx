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
 *
 * No new packages needed — Context + AsyncStorage + expo-image cachePolicy covers it.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AVATAR_URL_KEY = "qrg:avatar:url";
const AVATAR_VER_KEY = "qrg:avatar:version";

interface AvatarState {
  url: string | null;
  version: number;
  cachedUrl: string | null;
  setAvatar: (url: string) => void;
  syncAvatar: (url: string | null) => void;
  clearAvatar: () => void;
}

const AvatarContext = createContext<AvatarState>({
  url: null,
  version: 0,
  cachedUrl: null,
  setAvatar: () => {},
  syncAvatar: () => {},
  clearAvatar: () => {},
});

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    AsyncStorage.multiGet([AVATAR_URL_KEY, AVATAR_VER_KEY]).then((pairs) => {
      const storedUrl = pairs[0][1];
      const storedVer = pairs[1][1];
      if (storedUrl) setUrl(storedUrl);
      if (storedVer) setVersion(Number(storedVer));
    }).catch(() => {});
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
      if (prev === newUrl) return prev;
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

  const cachedUrl = url ? `${url}?v=${version}` : null;

  return (
    <AvatarContext.Provider value={{ url, version, cachedUrl, setAvatar, syncAvatar, clearAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  return useContext(AvatarContext);
}
