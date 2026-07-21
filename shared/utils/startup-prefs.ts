/**
 * startup-prefs.ts — single AsyncStorage.multiGet for all startup preferences.
 *
 * Problem solved:
 *   ThemeProvider, AvatarProvider, ConsentGatedApp, haptics, and the tab
 *   startup-screen pref each issued separate AsyncStorage.getItem() calls.
 *   Every call crosses the JS → native bridge (~5–15 ms each). Because
 *   ThemeProvider blocked the React tree with a null-gate, these calls ran
 *   serially, adding 25–75 ms of sequential bridge overhead to startup.
 *
 * Solution:
 *   1. This module is imported at the top of app/_layout.tsx, which causes
 *      AsyncStorage.multiGet([all six keys]) to fire at JS-bundle-evaluation
 *      time — well before any React component mounts (~100–300 ms head-start).
 *   2. All providers call prefetchStartupPrefs(), which returns the same
 *      in-flight Promise — zero duplicate bridge calls.
 *   3. isStartupPrefsLoaded() lets consumers synchronously initialise their
 *      useState() from the cache on first render (common case: the prefetch
 *      finishes before the font gate re-opens React, so the cache is warm).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Key registry ─────────────────────────────────────────────────────────────
// Single source of truth for every key read at startup.
// Add future startup-time prefs here; remove from the individual components.
export const STARTUP_PREF_KEYS = {
  THEME_MODE:      "qrguard_theme_mode",
  AVATAR_URL:      "qrg:avatar:url",
  AVATAR_VERSION:  "qrg:avatar:version",
  HAPTICS_ENABLED: "haptic_enabled",
  CONSENT_VERSION: "qrguard_consent_version",
  STARTUP_SCREEN:  "qrg:startup:screen",
} as const;

type PrefKey = (typeof STARTUP_PREF_KEYS)[keyof typeof STARTUP_PREF_KEYS];

// ─── Internal state ───────────────────────────────────────────────────────────
let _cache: Map<PrefKey, string | null> | null = null;
let _promise: Promise<void> | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Kick off (or await) the single multiGet for all startup pref keys.
 * Idempotent — safe to call from multiple components; only one bridge round-trip
 * is ever made per app session.
 */
export function prefetchStartupPrefs(): Promise<void> {
  if (_cache !== null) return Promise.resolve();
  if (_promise) return _promise;
  const keys = Object.values(STARTUP_PREF_KEYS) as PrefKey[];
  _promise = AsyncStorage.multiGet(keys)
    .then((pairs) => {
      _cache = new Map(pairs as [PrefKey, string | null][]);
    })
    .catch(() => {
      // Never block startup on a storage read failure — fall back to defaults.
      _cache = new Map();
    });
  return _promise;
}

/**
 * Read a single pref from the resolved cache.
 * Returns null when the key was not stored or the cache is not yet ready.
 * Always call (or await) prefetchStartupPrefs() before using this.
 */
export function getStartupPref(key: PrefKey): string | null {
  return _cache?.get(key) ?? null;
}

/**
 * True once the multiGet has resolved and getStartupPref() can be called
 * synchronously — e.g. inside a useState() initialiser.
 */
export function isStartupPrefsLoaded(): boolean {
  return _cache !== null;
}

// ─── Auto-prefetch at module-load time ───────────────────────────────────────
// Importing this module (which happens when _layout.tsx is evaluated, before
// any React component mounts) fires the bridge call immediately so it has a
// 100–300 ms head-start on any component-level useEffect reads.
prefetchStartupPrefs();
