import { db } from "@/lib/db/client";
import { COLLECTIONS } from "@/shared/constants/collections";

const USER_PROFILE_CACHE = new Map<string, { data: any; expiry: number }>();
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

export function getCachedUserProfile(userId: string): any | null {
  const cached = USER_PROFILE_CACHE.get(userId);
  if (cached && Date.now() < cached.expiry) return cached.data;
  USER_PROFILE_CACHE.delete(userId);
  return null;
}

export function setCachedUserProfile(userId: string, data: any): void {
  USER_PROFILE_CACHE.set(userId, { data, expiry: Date.now() + PROFILE_CACHE_TTL_MS });
}

export function clearUserProfileCache(): void {
  USER_PROFILE_CACHE.clear();
}

export async function warmUserProfileCache(userId: string): Promise<void> {
  if (getCachedUserProfile(userId)) return;
  try {
    const data = await db.get([COLLECTIONS.USERS, userId]);
    if (data) setCachedUserProfile(userId, data);
  } catch {}
}
