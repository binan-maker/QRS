// ── Auth session hook ─────────────────────────────────────────────────────────
// Subscribes to Supabase's onAuthStateChange and keeps local auth state in sync.
// Handles: email-verification checks, DB profile enrichment (username /
// photo), TanStack Query prefetch, and avatar sync.

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { authAdapter } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";
import { db } from "@/lib/db";
import { COLLECTIONS } from "@/shared/constants/collections";
import { prewarmUserData } from "@/services/cache/prewarm";
import { syncAvatarFromOutside } from "@/shared/contexts/AvatarContext";
import type { AuthUser } from "@/lib/auth/types";

interface Params {
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  setToken: Dispatch<SetStateAction<string | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  /** Set to true here; read by useGoogleAuth to skip a redundant signInSilently. */
  firebaseSessionRestoredRef: MutableRefObject<boolean>;
}

export function useFirebaseSession({
  setUser,
  setToken,
  setIsLoading,
  firebaseSessionRestoredRef,
}: Params): void {
  useEffect(() => {
    const unsubscribe = authAdapter.onIdTokenChanged(async (adapterUser) => {
      if (adapterUser) {
        // Mark that Firebase restored a session — suppresses the Google
        // signInSilently call in useGoogleAuth for this launch.
        firebaseSessionRestoredRef.current = true;

        let resolvedUser = adapterUser;

        // The persisted JWT can cache emailVerified:false even after the user
        // has verified. Reload from Firebase before treating it as unverified.
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

          // Prefer the Firestore photo (app-uploaded) over the Firebase Auth
          // photo (always the Google profile picture for Google sign-in users).
          const initialPhotoURL =
            (cachedProfile?.photoURL as string | undefined) ||
            resolvedUser.photoURL ||
            undefined;

          const authUser: AuthUser = {
            id: resolvedUser.uid,
            email: resolvedUser.email ?? "",
            displayName:
              resolvedUser.displayName ??
              resolvedUser.email?.split("@")[0] ??
              "User",
            photoURL: initialPhotoURL,
            emailVerified: resolvedUser.emailVerified,
            username: (cachedProfile?.username as string) || undefined,
          };

          setUser(authUser);
          setToken(idToken);
          setIsLoading(false);

          // Pre-warm history / favorites / stats so tabs render with data.
          prewarmUserData(resolvedUser.uid).catch(() => {});

          // Enrich user state with Firestore username and app-uploaded photo.
          queryClient.prefetchQuery({
            queryKey: ["userProfile", resolvedUser.uid],
            queryFn: async () => {
              const userData = await db.get([COLLECTIONS.USERS, resolvedUser.uid]);
              if (userData) {
                const firestorePhotoURL = userData.photoURL as string | undefined;
                setUser((prev) => {
                  if (!prev || prev.id !== resolvedUser.uid) return prev;
                  return {
                    ...prev,
                    username: (userData.username as string) || prev.username,
                    // Prefer Firestore photo; fall back to existing photo.
                    photoURL: firestorePhotoURL || prev.photoURL,
                  };
                });
                if (firestorePhotoURL) {
                  syncAvatarFromOutside(firestorePhotoURL);
                }
              }
              return userData;
            },
            staleTime: 5 * 60 * 1000,
          });
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
        queryClient.removeQueries({ queryKey: ["userProfile"] });
      }
    });

    return unsubscribe;
  }, []);
}
