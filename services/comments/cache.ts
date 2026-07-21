import { db } from "@/lib/db/client";
import type { CommentItem } from "../types";
import { COLLECTIONS } from "@/shared/constants/collections";

const userProfileCache = new Map<string, { username?: string; photoURL?: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getUserProfileCache(userId: string): { username?: string; photoURL?: string } | null {
  const cached = userProfileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { username: cached.username, photoURL: cached.photoURL };
  }
  return null;
}

export function setUserProfileCache(userId: string, username?: string, photoURL?: string): void {
  userProfileCache.set(userId, { username, photoURL, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCommentProfileCache(): void {
  userProfileCache.clear();
}

export async function preloadUserProfile(userId: string): Promise<void> {
  if (getUserProfileCache(userId)) return;
  try {
    const userData = await db.get([COLLECTIONS.USERS, userId]);
    if (userData) {
      setUserProfileCache(userId, userData.username as string | undefined, userData.photoURL as string | undefined);
    }
  } catch {}
}

export async function enrichCommentsWithProfiles(comments: CommentItem[]): Promise<CommentItem[]> {
  const needsEnrichment = comments.filter((c) => c.userId && (!c.userUsername || !c.userPhotoURL));
  if (needsEnrichment.length === 0) return comments;

  const uniqueUserIds = [...new Set(needsEnrichment.map((c) => c.userId!))];

  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      if (getUserProfileCache(uid)) return;
      try {
        const userData = await db.get([COLLECTIONS.USERS, uid]);
        if (userData) {
          setUserProfileCache(
            uid,
            userData.username as string | undefined,
            (userData.photoURL || userData.avatar) as string | undefined
          );
        }
      } catch {}
    })
  );

  return comments.map((c) => {
    if (!c.userId) return c;
    const cached = getUserProfileCache(c.userId);
    if (!cached) return c;
    return {
      ...c,
      userUsername: c.userUsername || cached.username,
      userPhotoURL: c.userPhotoURL || cached.photoURL,
    };
  });
}