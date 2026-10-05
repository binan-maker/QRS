// ── Auth session hook ─────────────────────────────────────────────────────────
// Subscribes to the auth provider's state changes and keeps local auth state in sync.
// Handles: email-verification checks, DB profile enrichment (username /
// photo), TanStack Query prefetch, and avatar sync.

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { authAdapter } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { db } from "@/lib/db";
import { COLLECTIONS } from "@/shared/constants/collections";
import { prewarmUserData } from "@/services/cache/prewarm";
import {
  isUserUploadedPhoto,
  pickBestPhotoUrl,
  syncAvatarFromOutside,
  clearAvatarFromOutside,
} from "@/shared/contexts/AvatarContext";
import type { AuthUser } from "@/lib/auth/types";
import {
  cacheAuthUser,
  clearCachedAuthUser,
  getCachedAuthUser,
} from "@/lib/auth/session-cache";
import { getStartupPref, isStartupPrefsLoaded, STARTUP_PREF_KEYS } from "@/lib/startup-prefs";

interface Params {
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  setToken: Dispatch<SetStateAction<string | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  /** Set to true here; read by useGoogleAuth to skip a redundant signInSilently. */
  sessionRestoredRef: MutableRefObject<boolean>;
}

export function useAuthSession({
  setUser,
  setToken,
  setIsLoading,
  sessionRestoredRef,
}: Params): void {
  useEffect(() => {
    const unsubscribe = authAdapter.onIdTokenChanged(async (adapterUser) => {
      if (adapterUser) {
        // Mark that Supabase restored a session — suppresses the Google
        // signInSilently call in useGoogleAuth for this launch.
        sessionRestoredRef.current = true;

        let resolvedUser = adapterUser;

        // The persisted session can cache emailVerified:false even after the user
        // has verified. Reload from Supabase before treating it as unverified.
        if (!adapterUser.emailVerified) {
          try {
            await adapterUser.reload();
            const fresh = authAdapter.getCurrentUser();
            if (!fresh || !fresh.emailVerified) {
              setUser(null);
              setToken(null);
              setIsLoading(false);
              return;
            }
            resolvedUser = fresh;
          } catch {
            setUser(null);
            setToken(null);
            setIsLoading(false);
            return;
          }
        }

        try {
          const idToken = await resolvedUser.getIdToken();

          // If TanStack Query already has the profile cached (from an earlier
          // fetch), seed username/photoURL immediately to avoid a gap where
          // user.username is undefined on token refresh.
          const cachedProfile = queryClient.getQueryData<any>([
            "userProfile",
            resolvedUser.uid,
          ]);
          const cachedSnapshot = getCachedAuthUser();
          const sameSnapshotUser =
            cachedSnapshot && cachedSnapshot.id === resolvedUser.uid
              ? cachedSnapshot
              : null;
          const startupAvatar = isStartupPrefsLoaded()
            ? getStartupPref(STARTUP_PREF_KEYS.AVATAR_URL)
            : null;

          // Prefer any user-uploaded photo (from query cache, auth snapshot, or startup avatar)
          // over the auth provider photo (which is the Google profile picture for Google sign-in users).
          const initialPhotoURL =
            pickBestPhotoUrl(
              cachedProfile?.photoURL as string | undefined,
              cachedProfile?.avatarUrl as string | undefined,
              sameSnapshotUser?.photoURL,
              isUserUploadedPhoto(startupAvatar) ? startupAvatar : null,
              resolvedUser.photoURL
            ) || undefined;

          const authUser: AuthUser = {
            id: resolvedUser.uid,
            email: resolvedUser.email ?? "",
            displayName:
              (cachedProfile?.displayName as string) ||
              sameSnapshotUser?.displayName ||
              resolvedUser.displayName ||
              resolvedUser.email?.split("@")[0] ||
              "User",
            photoURL: initialPhotoURL,
            emailVerified: resolvedUser.emailVerified,
            username:
              (cachedProfile?.username as string) ||
              sameSnapshotUser?.username ||
              undefined,
          };

          setUser(authUser);
          setToken(idToken);
          setIsLoading(false);
          cacheAuthUser(authUser);

          // Pre-warm history and stats so tabs render with data.
          prewarmUserData(resolvedUser.uid).catch(() => {});

          // Enrich user state with authoritative DB username, display name, and app-uploaded photo.
          queryClient.fetchQuery({
            queryKey: ["userProfile", resolvedUser.uid],
            queryFn: async () => {
              const userData = await db.get([COLLECTIONS.USERS, resolvedUser.uid]);
              if (userData) {
                const dbPhotoURL = pickBestPhotoUrl(
                  userData.photoURL as string | undefined,
                  userData.avatarUrl as string | undefined,
                  userData.photo_url as string | undefined,
                  userData.avatar_url as string | undefined
                );
                const dbDisplayName =
                  (userData.displayName as string) ||
                  (userData.display_name as string);
                const dbExplicitlyNullPhoto =
                  userData.photoURL === null &&
                  (userData.avatarUrl === null || userData.avatarUrl === undefined);

                setUser((prev) => {
                  if (!prev || prev.id !== resolvedUser.uid) return prev;
                  const resolvedPhoto = dbPhotoURL
                    ? dbPhotoURL
                    : dbExplicitlyNullPhoto
                      ? undefined
                      : prev.photoURL;
                  const nextUser: AuthUser = {
                    ...prev,
                    displayName: dbDisplayName || prev.displayName,
                    username: (userData.username as string) || prev.username,
                    photoURL: resolvedPhoto,
                  };
                  cacheAuthUser(nextUser);
                  return nextUser;
                });

                if (dbPhotoURL) {
                  syncAvatarFromOutside(dbPhotoURL);
                } else if (dbExplicitlyNullPhoto) {
                  clearAvatarFromOutside();
                }
              }
              return userData;
            },
            staleTime: 0,
          }).catch(() => {});
        } catch {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
      } else {
        // Signed out
        setUser(null);
        setToken(null);
        setIsLoading(false);
        clearCachedAuthUser();
        queryClient.removeQueries({ queryKey: ["userProfile"] });
      }
    });

    return unsubscribe;
  }, []);
}
