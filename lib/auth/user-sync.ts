// ── User sync ─────────────────────────────────────────────────────────────────
// Handles creating / updating the user profile after any sign-in.
// Extracted from AuthContext so it can be used by any auth flow without
// pulling in React.

import { db } from "@/lib/db";
import { generateUniqueUsername } from "@/lib/auth/utils";
import { COLLECTIONS } from "@/shared/constants/collections";

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
          isVerified: false,
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
      isVerified: false,
    });
  } catch {}
  return fallback;
}

// ── syncUserToDb ──────────────────────────────────────────────────────────────
// Creates the user document on first sign-in; backfills a username if missing.
// Throws "This account has been deleted." if the account is soft-deleted.

export async function syncUserToDb(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  overrideName?: string,
  emailVerified?: boolean,
): Promise<void> {
  try {
    const userData = await db.get([COLLECTIONS.USERS, uid]);
    if (!userData) {
      const name = overrideName || displayName || email?.split("@")[0] || "User";
      const username = await reserveUsername(uid, name);
      await db.set([COLLECTIONS.USERS, uid], {
        email,
        emailVerified: emailVerified ?? false,
        displayName: name,
        photoURL: photoURL || null,
        isDeleted: false,
        createdAt: db.timestamp(),
        username,
      });
    } else if (userData.isDeleted) {
      throw new Error("ACCOUNT_DELETED");
    } else {
      const updates: Record<string, unknown> = {};
      if (displayName && displayName !== userData.displayName) {
        updates.displayName = displayName;
      }
      if (photoURL && photoURL !== userData.photoURL) {
        updates.photoURL = photoURL;
      }
      if (email && email !== userData.email) {
        updates.email = email;
      }
      if (emailVerified !== undefined && emailVerified !== userData.emailVerified) {
        updates.emailVerified = emailVerified;
      }
      if (!userData.username) {
        const name = overrideName || displayName || userData.displayName || "User";
        updates.username = await reserveUsername(uid, name);
      }
      if (Object.keys(updates).length > 0) {
        await db.update([COLLECTIONS.USERS, uid], updates);
      }
    }
  } catch (e: any) {
    if (e.message === "ACCOUNT_DELETED") throw new Error("This account has been deleted.");
    throw e;
  }
}
