// ── User sync ─────────────────────────────────────────────────────────────────
// Handles creating / updating the user profile after any sign-in.
// Extracted from AuthContext so it can be used by any auth flow without
// pulling in React.

import { db } from "@/lib/db";
import { generateUniqueUsername } from "@/lib/auth/utils";
import { COLLECTIONS } from "@/shared/constants/collections";
import {
  isUserUploadedPhoto,
  pickBestPhotoUrl,
  syncAvatarFromOutside,
} from "@/shared/contexts/AvatarContext";

export interface SyncedUserProfile {
  displayName: string;
  username?: string;
  photoURL: string | null;
}

// ── Username reservation ──────────────────────────────────────────────────────
// Tries up to 5 random suffixes before falling back to uid-based username.
// Not exported — only syncUserToDb should call this.

async function reserveUsername(uid: string, displayName: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await generateUniqueUsername(displayName);
    try {
      await db.set([COLLECTIONS.USERNAMES, candidate], {
        userId: uid,
        claimedAt: db.timestamp(),
      });
      return candidate;
    } catch {
      // Collision — try again
    }
  }
  const fallback = "user" + uid.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "x");
  try {
    await db.set([COLLECTIONS.USERNAMES, fallback], {
      userId: uid,
      claimedAt: db.timestamp(),
    });
  } catch {}
  return fallback;
}

// ── syncUserToDb ──────────────────────────────────────────────────────────────
// Creates the user document on first sign-in; backfills a username if missing.
// Preserves user-uploaded custom profile photos and custom display names in
// Supabase public.users (matching Web's auth-context.tsx behavior).
// Throws "This account has been deleted." if the account is soft-deleted.

export async function syncUserToDb(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  overrideName?: string,
  emailVerified?: boolean,
): Promise<SyncedUserProfile> {
  try {
    const userData = await db.get([COLLECTIONS.USERS, uid]);
    if (!userData) {
      const name = overrideName || displayName || email?.split("@")[0] || "User";
      const initialPhoto = photoURL || null;
      await db.set([COLLECTIONS.USERS, uid], {
        email: email || `${uid}@users.binro.app`,
        emailVerified: emailVerified ?? false,
        displayName: name,
        photoURL: initialPhoto,
        isDeleted: false,
        createdAt: db.timestamp(),
      });
      const username = await reserveUsername(uid, name);
      await db.update([COLLECTIONS.USERS, uid], { username }).catch(() => {});
      if (initialPhoto) {
        syncAvatarFromOutside(initialPhoto);
      }
      return {
        displayName: name,
        username,
        photoURL: initialPhoto,
      };
    } else if (
      userData.isDeleted ||
      userData.deletedAt ||
      userData.displayName === "Deleted User"
    ) {
      throw new Error("ACCOUNT_DELETED");
    } else {
      const updates: Record<string, unknown> = {};

      // Preserve user's saved display_name unless explicitly overridden or missing
      const existingDisplayName =
        (userData.displayName as string | undefined) ||
        (userData.display_name as string | undefined);
      const effectiveDisplayName =
        overrideName || existingDisplayName || displayName || email?.split("@")[0] || "User";

      if (overrideName && overrideName !== existingDisplayName) {
        updates.displayName = overrideName;
      } else if (!existingDisplayName && effectiveDisplayName) {
        updates.displayName = effectiveDisplayName;
      }

      // Preserve user-uploaded photo in public.users; NEVER overwrite with Google default photo
      const existingDbPhoto = pickBestPhotoUrl(
        userData.photoURL as string | undefined,
        userData.avatarUrl as string | undefined,
        userData.photo_url as string | undefined,
        userData.avatar_url as string | undefined
      );

      let effectivePhoto: string | null = existingDbPhoto;
      if (existingDbPhoto && isUserUploadedPhoto(existingDbPhoto)) {
        effectivePhoto = existingDbPhoto;
      } else if (photoURL && isUserUploadedPhoto(photoURL)) {
        effectivePhoto = photoURL;
        if (photoURL !== existingDbPhoto) {
          updates.photoURL = photoURL;
        }
      } else if (!existingDbPhoto && userData.photoURL === undefined && photoURL) {
        effectivePhoto = photoURL;
        updates.photoURL = photoURL;
      }

      if (email && email !== userData.email) {
        updates.email = email;
      }
      if (emailVerified !== undefined && emailVerified !== userData.emailVerified) {
        updates.emailVerified = emailVerified;
      }

      let effectiveUsername = userData.username as string | undefined;
      if (!effectiveUsername) {
        effectiveUsername = await reserveUsername(uid, effectiveDisplayName);
        updates.username = effectiveUsername;
      }

      if (Object.keys(updates).length > 0) {
        await db.update([COLLECTIONS.USERS, uid], updates);
      }

      if (effectivePhoto) {
        syncAvatarFromOutside(effectivePhoto);
      }

      return {
        displayName: effectiveDisplayName,
        username: effectiveUsername,
        photoURL: effectivePhoto,
      };
    }
  } catch (e: any) {
    if (e.message === "ACCOUNT_DELETED") throw new Error("This account has been deleted.");
    throw e;
  }
}
