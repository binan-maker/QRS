import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getStartupPref,
  isStartupPrefsLoaded,
  STARTUP_PREF_KEYS,
} from "@/lib/startup-prefs";
import type { AuthUser } from "./types";

let memoryOverride: AuthUser | null | undefined;

function parseAuthUser(raw: string | null): AuthUser | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.displayName !== "string" ||
      typeof parsed.emailVerified !== "boolean"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      email: parsed.email,
      displayName: parsed.displayName,
      photoURL: typeof parsed.photoURL === "string" ? parsed.photoURL : null,
      emailVerified: parsed.emailVerified,
      username: typeof parsed.username === "string" ? parsed.username : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the last authenticated user's display-safe identity while Firebase
 * restores its real persisted session. This is never used as an auth token.
 */
export function getCachedAuthUser(): AuthUser | null {
  if (memoryOverride !== undefined) return memoryOverride;
  if (!isStartupPrefsLoaded()) return null;
  return parseAuthUser(getStartupPref(STARTUP_PREF_KEYS.AUTH_SNAPSHOT));
}

export function cacheAuthUser(user: AuthUser): void {
  memoryOverride = user;
  AsyncStorage.setItem(
    STARTUP_PREF_KEYS.AUTH_SNAPSHOT,
    JSON.stringify(user),
  ).catch(() => {});
}

export function clearCachedAuthUser(): void {
  memoryOverride = null;
  AsyncStorage.removeItem(STARTUP_PREF_KEYS.AUTH_SNAPSHOT).catch(() => {});
}