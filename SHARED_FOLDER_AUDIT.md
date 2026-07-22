# `shared/` Folder — Production-Grade Audit Report
**BinRo · July 2026**

---

## Executive Summary

The `shared/` folder contains **82 files** across components, contexts, utilities, constants, and i18n infrastructure. The architecture is generally coherent and the adapter pattern is respected in most areas — however, there are **5 critical issues**, **9 high-severity issues**, and **23 medium/low issues** that must be resolved before this codebase can be considered production-grade.

The most severe class of problems is **upward dependency violations**: `shared/` imports from `features/`, `services/`, and `store/` — inverting the intended layering. This creates circular-risk and makes shared infrastructure un-testable in isolation.

---

## Severity Legend

| Severity | Meaning |
|---|---|
| 🔴 CRITICAL | Architectural violation, data correctness risk, or production crash path |
| 🟠 HIGH | Technical debt with active maintenance cost or runtime risk |
| 🟡 MEDIUM | Code quality, inconsistency, or refactor opportunity |
| 🔵 LOW | Cleanup, polish, or convention alignment |

---

## Part 1 · Dependency Boundary Violations

### 🔴 CRITICAL-1 — `shared/` imports from `features/`

**File:** `shared/components/customize/ColorsTab.tsx`  
**Line:** 5  
```ts
import { QR_COLOR_THEMES } from "@/features/generator/components/QrThemeSection";
```

`shared/` is the bottom layer of the dependency graph. Importing from `features/` is a hard architectural inversion. The `customize/` components (`ColorsTab`, `LogoTab`, `OptionsTab`) are not general-purpose shared components — they are QR generator UI that belongs inside `features/generator/`.

**Impact:** Any change to `features/generator` can break `shared/`. `shared/` cannot be tested, linted, or bundled independently. The intent of the adapter pattern is undermined.

**Fix:**
1. Move `shared/components/customize/` → `features/generator/components/customize/`
2. Update all import sites
3. Remove the three files from `shared/`

---

### 🔴 CRITICAL-2 — `AuthContext` imports from `services/` and `store/`

**File:** `shared/contexts/AuthContext.tsx`  
**Lines:** 2, 14–23

```ts
import { useAuthStore }                 from "@/store/authStore";
import { clearAllMemCache, clearAllAsyncStorageCache } from "@/services/cache/qr-cache";
import { clearAllAnonymousSessions }   from "@/services/cache/anonymous-session";
import { prewarmUserData, clearPrewarmState } from "@/services/prewarm";
import { clearUserProfileCache }       from "@/services/user/cache";
import { clearCommentProfileCache }    from "@/services/comments/cache";
import { trackLoginCompleted }         from "@/lib/analytics";
```

`AuthContext` is in `shared/` but depends on 6 `services/` modules and the Zustand `store/`. According to the project's own dependency rules (`replit.md`): _"Application (`services/`) may import `lib/auth`, `lib/db`, `lib/storage`"_ — not the other way around.

**Impact:** A cache service change can break the auth context. `shared/` cannot be imported by a third-party package or tested without the full services layer running.

**Fix:**  
Introduce a `signOutSideEffects` callback prop on `AuthProvider` (or an event bus pattern):
```ts
// features/root/AuthSideEffects.ts — registers cache clearing
// AuthProvider receives: onSignOut?: () => void | Promise<void>
```
This keeps `AuthContext` ignorant of all caching, pre-warming, and store concerns.

---

### 🔴 CRITICAL-3 — `consent-manager-types.ts` shadows the real `db` adapter

**File:** `shared/components/consent/consent-manager-types.ts`  
**Lines:** 28–40

```ts
export const db = {
  async get(path: string[]): Promise<any> {
    const raw = await AsyncStorage.getItem(path.join("/"));
    return raw ? JSON.parse(raw) : null;
  },
  async set(path: string[], value: unknown): Promise<void> { ... }
};
```

This file exports a local object named `db` that uses **AsyncStorage** and has the same interface as the global `db` adapter (Firestore). `ConsentManager.tsx` imports both — the local `db` from this file and the real `db` from `@/lib/db`. The naming collision means any developer refactoring imports can silently route consent writes to AsyncStorage instead of Firestore (or vice versa).

Meanwhile, `ConsentManager.tsx` (line 9) uses the real `db` adapter for the actual Firestore writes: `await db.get([COLLECTIONS.USERS, user.id, "consent"])` — the local `db` in `consent-manager-types.ts` is simply dead weight that is never called.

**Fix:**
1. Remove the fake `db` from `consent-manager-types.ts` entirely
2. Remove `logAuditEvent` from that file (it also implements AsyncStorage-only logging that is never surfaced to any monitoring system)
3. If audit logging is real, route it through `@/lib/analytics` or a proper audit service

---

### 🔴 CRITICAL-4 — Two parallel consent systems with incompatible data models

**Files:** `shared/components/consent/ConsentManager.tsx` + `shared/components/consent/ConsentModal.tsx`

| | `ConsentManager` | `ConsentModal` |
|---|---|---|
| Version | DPDP Act 2023 (no version string) | `v3.0` |
| Storage | Firestore via real `db` adapter | AsyncStorage (`qrguard_consent_version`) |
| Data | 9 granular boolean flags | Single version string |
| Auth | Requires `useAuth()` user | Stateless |
| Theme | Hardcoded `#4F46E5` | Uses `ThemeContext` |
| Status | Appears unmaintained | Active |

These are two completely different consent flows. The app has no single source of truth for whether consent has been given. A user could satisfy `ConsentModal` (AsyncStorage v3.0) but have nothing in Firestore, or satisfy `ConsentManager` without a version string that `hasUserConsented()` can check.

**Fix:**
1. Determine which is the canonical flow (likely `ConsentModal` — it's themed, versioned, actively styled)
2. Delete `ConsentManager.tsx`, `consent-manager-types.ts`, `consent-manager-styles.ts`, and `ConsentOption.tsx` (only used by `ConsentManager`)
3. If the DPDP granular options are legally required, add them as sections inside `ConsentScrollBody`

---

### 🔴 CRITICAL-5 — `url-risk.ts` and `schema.ts` are shims pointing outside `shared/`

**Files:** `shared/utils/url-risk.ts`, `shared/schema.ts`

```ts
// shared/utils/url-risk.ts
export { computeUrlRisk } from "@/services/analysis/url-risk";  // ← services layer

// shared/schema.ts
export * from "../packages/db/src/schema";  // ← relative path to packages/
```

`url-risk.ts` re-exports from `@/services/analysis/url-risk`, meaning `shared/` imports from `services/`. This is the same inversion as CRITICAL-2.

`schema.ts` creates a module alias from `shared/` to `packages/db/` — a cross-package shim that bypasses the workspace package system. This should be done via tsconfig paths or package.json exports, not a re-export file inside `shared/`.

**Fix:**
1. `shared/utils/url-risk.ts` — delete it; update callers to import directly from `@/services/analysis/url-risk`
2. `shared/schema.ts` — delete it; add `"@binro/db"` or `"@/db"` as a proper tsconfig path alias pointing to `packages/db/src/schema`

---

## Part 2 · Duplicate Code

### 🟠 HIGH-6 — Three nearly identical scroll-hide hooks

**Files:**
- `shared/utils/use-header-hide.ts` — hides a header
- `shared/utils/use-nav-hide.ts` — hides a nav bar
- `shared/contexts/TabBarContext.tsx` — hides the tab bar

All three implement the same scroll-direction detection algorithm with the same `THRESHOLD = 8`, `lastY` ref, and `hidden` ref pattern. The first two use Reanimated `withTiming`; the third uses the legacy `Animated` API.

**Diff between `useHeaderHide` and `useNavHide`:**

| | `useHeaderHide` | `useNavHide` |
|---|---|---|
| HIDE_DURATION | 260 | 280 |
| SHOW_DURATION | 320 | 340 |
| Exported style prop | `headerStyle` | `navAnimatedStyle` |
| Reset fn | `reset()` | — (missing) |

The two hooks differ only by name, constants, and the absence of a reset in `useNavHide`.

**Fix:**
```ts
// shared/hooks/useScrollHide.ts
export function useScrollHide(opts?: { hideDuration?: number; showDuration?: number }) {
  // single implementation
}
```
Replace both hooks with this parameterized version. `TabBarContext` should also be migrated to Reanimated for consistency.

---

### 🟠 HIGH-7 — Duplicate `formatRelativeTime` in `NotificationsModal`

**File:** `shared/components/notifications/NotificationsModal.tsx`  
**Lines:** 36–44

```ts
function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
```

`shared/utils/formatters/time.ts` already exports `formatCompactRelativeTime` which performs the same calculation. This local function is a duplicate written in isolation.

**Fix:** Delete the local function; import `formatCompactRelativeTime` from `@/shared/utils/formatters`.

---

### 🟠 HIGH-8 — Dual donation components with no unification

**Files:** `shared/components/ui/DonationBannerCard.tsx` + `shared/components/ui/DonationBannerFloat.tsx`

Both navigate to `/donation`, display donation copy, and use the same color palette. They differ only in layout (card vs floating overlay) and trigger context.

Neither is wrong on its own, but their existence as two separate files with duplicated copy text (`"Support BinRo"` / `"Enjoying BinRo? Support us"`) means copy changes must be made in two places.

**Fix:** Extract a single `<DonationBanner variant="card" | "float" />` component, or at minimum extract the copy text and route target into a shared constant.

---

### 🟡 MEDIUM-9 — `shared/utils/formatters.ts` is a 1-line dead shim

**File:** `shared/utils/formatters.ts`

```ts
export * from "./formatters/index";
```

This file exists solely to make `import ... from "@/shared/utils/formatters"` work alongside `import ... from "@/shared/utils/formatters/time"`. The directory barrel (`formatters/index.ts`) already provides this. The shim adds a module with no content.

**Fix:** Grep all imports of `@/shared/utils/formatters` (not the sub-path), update them to `@/shared/utils/formatters` (the directory — Node resolves `index.ts` automatically), then delete `formatters.ts`.

---

### 🟡 MEDIUM-10 — `shared/utils/logger.ts` is a re-export shim that should be deleted

**File:** `shared/utils/logger.ts`  
**Lines:** 1–19

Its own docstring says _"Prefer importing from `@/lib/logger` directly for new code."_ This is tech debt preservation. Since this file was written acknowledging it should eventually go away, there is no reason to keep it.

**Fix:** Migrate all callers (`grep -r "shared/utils/logger"`) to `@/lib/logger`, then delete the file.

---

## Part 3 · Oversized / Overloaded Components

### 🟠 HIGH-11 — `AuthContext.tsx` is a 626-line god context

**File:** `shared/contexts/AuthContext.tsx`

This single file handles:
1. Google Sign-In SDK initialization and configuration
2. Firebase ID token lifecycle (`onIdTokenChanged`)
3. Silent sign-in with 800ms timer guard
4. Email verification flow
5. Firestore user document creation (`syncUserToDb`)
6. Username reservation with retry logic (`reserveUsername`)
7. TanStack Query cache hydration
8. Cross-context synchronization (`syncAvatarFromOutside`)
9. Sign-out with AsyncStorage cleanup across 7 cache systems
10. Password reset / verification email
11. Zustand store sync (`useAuthStore`)

**Concern areas:**

| Lines | Concern |
|---|---|
| 25–51 | `serverValidateEmail` — HTTP fetch function in context file |
| 59–77 | Google SDK dynamic `require()` and `configure()` at module load time |
| 108–147 | `reserveUsername` and `syncUserToDb` — domain logic, not context infrastructure |
| 176–181 | Manual Zustand sync in `useEffect` — dual source of truth |
| 284–308 | 800ms timer in `useEffect` — heuristic timing in shared infrastructure |
| 488–524 | 7-service cache cleanup in `signOut` — cross-layer coupling |

**Fix (phased):**
- Extract `reserveUsername` + `syncUserToDb` → `services/user/sync.ts`
- Extract `serverValidateEmail` → `services/auth/email-validation.ts`
- Replace manual Zustand sync `useEffect` with a single `useAuthStore.setState()` call inside `onIdTokenChanged`
- Accept an `onSignOut` callback prop to decouple cache clearing

---

### 🟡 MEDIUM-12 — `BottomSheet` duplicates Android nav-bar logic already in `useAndroidNavBar`

**File:** `shared/components/ui/BottomSheet.tsx`  
**Lines:** 115–122

```ts
useEffect(() => {
  if (Platform.OS === "android") {
    NavigationBar.setButtonStyleAsync(
      (colors as any).isDark ? "light" : "dark"
    ).catch(() => {});
  }
}, [(colors as any).isDark]);
```

1. `colors.isDark` is not part of `AppColors` — this is accessed with `(colors as any).isDark`, bypassing type safety
2. `shared/utils/use-android-nav-bar.ts` already provides `useAndroidNavBar` for exactly this purpose
3. `isDark` is available from `useTheme()` which is already called on line 106

**Fix:** Replace the manual `useEffect` + `NavigationBar` call with `useAndroidNavBar(visible, ..., ..., isDark)` from the existing hook; remove the `as any` cast.

---

## Part 4 · Unnecessary State & Effects

### 🟡 MEDIUM-13 — `ToastProvider` has redundant dual cleanup

**File:** `shared/components/ui/Toast.tsx`  
**Lines:** 38–49

```ts
// Path 1: animation completes naturally and calls setToast(...visible: false)
animRef.current.start(({ finished }) => {
  if (finished) setToast(prev => ({ ...prev, visible: false }));
});

// Path 2: redundant setTimeout also hides the toast
timerRef.current = setTimeout(() => {
  setToast(prev => ({ ...prev, visible: false }));
}, 3200); // animation total = 200 + 2400 + 200 = 2800ms
```

The animation sequence already handles hiding (`toValue: 0` at 2800ms). The `setTimeout` at 3200ms is a redundant fallback that fires 400ms late and causes a second `setState` on an already-hidden toast. Combined with `anim.setValue(0)` resetting before `animRef.current?.stop()` — there are ordering issues on rapid consecutive calls.

**Fix:**
```ts
// Remove the setTimeout entirely.
// Only keep the animation callback for cleanup.
animRef.current = Animated.sequence([...]);
animRef.current.start(({ finished }) => {
  if (finished) setToast(prev => ({ ...prev, visible: false }));
});
```
If a safety net is needed, move the `setTimeout` to 3500ms and only trigger it if `toast.visible` is still `true`.

---

### 🟡 MEDIUM-14 — `ConsentManager` `useEffect` has missing dependency

**File:** `shared/components/consent/ConsentManager.tsx`  
**Lines:** 31–37

```ts
useEffect(() => {
  if (visible && user) {
    loadExistingConsent();  // ← calls user.id
  } else if (!user) {
    setLoading(false);
  }
}, [visible, user]);  // ← loadExistingConsent not listed (stale closure risk)
```

`loadExistingConsent` closes over `user` but isn't in the dependency array. While `user` is listed (so re-runs if the user object changes), this is a lint error that ESLint exhaustive-deps will flag. If the function ever accesses other closed-over state, it will silently use stale values.

**Fix:** Move `loadExistingConsent` inside the `useEffect` body, or wrap it in `useCallback([user])`.

---

### 🟡 MEDIUM-15 — `ThemeContext` double-reads AsyncStorage unnecessarily

**File:** `shared/contexts/ThemeContext.tsx`  
**Lines:** 31, 79

```ts
// ThemeContext persists to STORAGE_KEY = "qrguard_theme_mode"
AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});

// startup-prefs reads from STARTUP_PREF_KEYS.THEME_MODE
getStartupPref(STARTUP_PREF_KEYS.THEME_MODE)
```

There are two storage keys for the same value. If `STARTUP_PREF_KEYS.THEME_MODE !== "qrguard_theme_mode"`, the startup-prefs cache reads a different key than `ThemeContext` writes — meaning the synchronous initialisation in `useState(() => ...)` will always get a stale value, falling back to the slow path every launch.

**Fix:** Audit that `STARTUP_PREF_KEYS.THEME_MODE === "qrguard_theme_mode"`. If they differ, consolidate to one key.

---

## Part 5 · Missing Memoization / Re-render Risk

### 🟡 MEDIUM-16 — `ColorsTab`, `LogoTab`, `OptionsTab` lack `React.memo`

**Files:** `shared/components/customize/` (all three)

These components receive multiple primitive and object props from the QR generator, which re-renders on every character typed in the content fields. None of the three tabs is wrapped in `React.memo`, causing full re-renders on every keystroke even when the customize UI is not visible or its props haven't changed.

**Fix:** Wrap each in `React.memo`. Memoize callback props (`onSelectTheme`, etc.) in the parent with `useCallback`.

---

### 🟡 MEDIUM-17 — `NotificationItem` uses `useCallback` without importing it

**File:** `shared/components/notifications/NotificationsModal.tsx`  
**Line:** 57

```ts
const handlePress = useCallback(() => { ... }, [...]);
```

`useCallback` is not in the React import at line 1 (`import React, { memo } from "react"`). This is a runtime error in strict mode — `useCallback is not a function`.

**Fix:** Add `useCallback` to the React import.

---

### 🟡 MEDIUM-18 — `SmartAvatar` only works for the logged-in user

**File:** `shared/components/ui/SmartAvatar.tsx`  
**Lines:** 13, 34

```ts
const { cachedUrl } = useAvatar();  // ← always the signed-in user's avatar
```

`SmartAvatar` is a generic-looking component (`name?: string`) but always shows the logged-in user's photo via `AvatarContext`. If used to display another user's avatar (e.g., in a comments section or leaderboard), it will silently show the current user's photo.

**Fix:** Accept an optional `uri?: string` prop. Use `uri` when provided; fall back to `cachedUrl` from `AvatarContext` only when `uri` is absent (self-avatar mode). Add a JSDoc comment clarifying the self-avatar default.

---

## Part 6 · Type Safety Issues

### 🟡 MEDIUM-19 — `any` types in production components

| File | Location | `any` usage |
|---|---|---|
| `NotificationsModal.tsx` | `getNotifColor(type, colors: any)` | colors object untyped |
| `NotificationsModal.tsx` | `ItemProps.colors: any` | prop type untyped |
| `BottomSheet.tsx` | `BodyProps.colors: any` | prop type untyped |
| `BottomSheet.tsx` | `(colors as any).isDark` | accessing non-existent property |
| `AuthContext.tsx` | `let GoogleSignin: any` | SDK untyped |
| `AuthContext.tsx` | `let statusCodes: any` | SDK untyped |
| `consent-manager-types.ts` | `db.get(): Promise<any>` | return type untyped |
| `TabBarContext.tsx` | `onTabScroll: (e: any)` | scroll event untyped |
| `use-nav-hide.ts` | `onNavScroll: (e: any)` | scroll event untyped |

**Fix:**
- Import `AppColors` from `@/shared/constants/colors` and use it instead of `any` for color props
- Type scroll events as `NativeSyntheticEvent<NativeScrollEvent>`
- Add `isDark` to `AppColors` type (it is provided by `ThemeContext` but not on the color object itself — pass it separately or extend the type)
- Type `GoogleSignin` against the SDK's exported types

---

### 🔵 LOW-20 — `DonationBannerCard` accesses `colors.isDark` which is not in `AppColors`

**File:** `shared/components/ui/DonationBannerCard.tsx`  
**Line:** 26

```ts
backgroundColor: colors.isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.07)",
```

`AppColors` (defined in `shared/constants/colors.ts`) does not include an `isDark` property. This compiles without error because TypeScript widens the object, but `colors.isDark` will always be `undefined`, making the ternary always resolve to the falsy branch.

**Fix:** Destructure `isDark` from `useTheme()` alongside `colors`:
```ts
const { colors, isDark } = useTheme();
```

---

## Part 7 · Styling Inconsistency

### 🟡 MEDIUM-21 — Mixed styling approaches across the same directory

| Component | Approach |
|---|---|
| `ConsentModal.tsx` | `StyleSheet.create` + large inline style blocks for theme values |
| `ConsentManager.tsx` | External `consent-manager-styles.ts` file (hardcoded colors, no theme) |
| `consent-primitives.tsx` | Fully inline styles |
| `ColorsTab.tsx` | Fully inline styles |
| `DonationBannerCard.tsx` | Fully inline styles |
| `DonationBannerFloat.tsx` | Fully inline styles |
| `SmartAvatar.tsx` | `StyleSheet.create` |
| `Toast.tsx` | `StyleSheet.create` with hardcoded dark colors (`#1E293B`, `#F1F5F9`) |
| `BottomSheet.tsx` | `StyleSheet.create` |
| `NotificationsModal.tsx` | `StyleSheet.create` |

**Specific problems:**

1. **`Toast.tsx` hardcodes dark theme colors** (`backgroundColor: "#1E293B"`, `color: "#F1F5F9"`). In light mode the toast will appear with a dark background regardless. Toast should consume `useTheme()`.

2. **`ConsentManager.tsx` hardcodes `#4F46E5`** for the loading spinner and button — this is not the app's primary color and ignores the theme entirely.

3. **`ConsentModal.tsx` derives 10 local color variables** from `isDark` manually (lines 49–58) instead of using the `colors` object from `useTheme()`. This duplicates theme logic.

**Fix:**
- Establish a house rule: use `StyleSheet.create` for structural/static styles; destructure `colors` from `useTheme()` for all theme-dependent values; never hardcode color hex strings in component files
- Apply `useTheme()` to `Toast.tsx` and `ConsentManager.tsx`
- Remove the 10 manual color derivations in `ConsentModal` and replace with `colors.*` tokens

---

### 🟡 MEDIUM-22 — `ConsentManager.tsx` uses `TouchableOpacity` instead of `Pressable`

**File:** `shared/components/consent/ConsentManager.tsx`  
**Lines:** 128, 132

The rest of the codebase uses `Pressable` (confirmed by `NotificationsModal`, `BottomSheet`, `DonationBannerCard`, `ConsentModal`). `TouchableOpacity` is the legacy API.

**Fix:** Replace `TouchableOpacity` with `Pressable`. Use `style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}` for the press feedback.

---

## Part 8 · File/Folder Structure Issues

### 🟠 HIGH-23 — Hooks scattered in `utils/` instead of a `hooks/` directory

**Files (all in `shared/utils/`):**
- `use-android-nav-bar.ts`
- `use-header-hide.ts`
- `use-nav-hide.ts`
- `use-network.ts`
- `use-scale.ts`

These are React hooks (they use React APIs and follow the `use*` naming convention). They live in `shared/utils/` but the project already has `shared/components/notifications/hooks/` as a precedent for a hooks subdirectory.

**Fix:** Create `shared/hooks/` and move all `use-*.ts` files there. Update import paths. This also eliminates the current confusion where hook files and pure utility files sit side-by-side.

---

### 🔵 LOW-24 — `ConsentManager.tsx` uses a relative import path

**File:** `shared/components/consent/ConsentManager.tsx`  
**Line:** 9

```ts
import { useAuth } from "../../contexts/AuthContext";
```

Every other file in the project uses the `@/shared/contexts/AuthContext` alias. This relative import is inconsistent and breaks if the file is moved.

**Fix:** `import { useAuth } from "@/shared/contexts/AuthContext";`

---

### 🔵 LOW-25 — `shared/models/chat.ts` exists with no consumers

**File:** `shared/models/chat.ts`

A quick inspection shows this file defines a chat data model. There is no chat feature visible in the route tree. This may be forward-declared work, but if it is unused it is dead code.

**Fix:** Grep for imports of `shared/models/chat`. If zero results, delete the file.

---

### 🔵 LOW-26 — `shared/schemas/CategorySchema.ts` exists alongside `shared/schema.ts`

Two schema-related files in different locations with no clear relationship. `shared/schema.ts` is a re-export shim (see CRITICAL-5). `shared/schemas/CategorySchema.ts` is a Zod schema for a `Category` type.

**Fix:** Move `CategorySchema.ts` to `validators/` (which already contains domain validators) or to `packages/core/`. Delete `shared/schema.ts` per CRITICAL-5.

---

## Part 9 · Minor Issues

### 🔵 LOW-27 — `TabBarContext` `NOOP_CTX` creates a floating `Animated.Value` at module scope

**File:** `shared/contexts/TabBarContext.tsx`  
**Lines:** 72–77

```ts
const NOOP_CTX: TabBarCtx = {
  tabBarTranslateY: new Animated.Value(0),  // ← module-level allocation
  ...
};
```

Module-level `Animated.Value` allocations are harmless in most cases but prevent the React Native animation system from cleaning them up with component lifecycle. Use `null` and guard at the call site, or lazily initialize.

---

### 🔵 LOW-28 — `AuthContext` 800ms timer is a fragile heuristic

**File:** `shared/contexts/AuthContext.tsx`  
**Lines:** 293–307

```ts
const timer = setTimeout(() => {
  if (firebaseSessionRestoredRef.current) return;
  GoogleSignin.signInSilently()...
}, 800);
```

This is documented in comments as _"give Firebase's onIdTokenChanged time to fire first"_. The 800ms window is a guess. On slow devices or cold starts, Firebase's AsyncStorage restoration could take longer. On fast devices this wastes 800ms on every launch.

**Fix:** Replace the timer with a `Promise.race([firebaseRestoredPromise, delay(1200)])` pattern where `firebaseRestoredPromise` resolves as soon as `onIdTokenChanged` fires. This eliminates both the false-negative (timer fires before Firebase) and the wasted wait time.

---

### 🔵 LOW-29 — `useAndroidNavBar` has two nearly identical exported functions

**File:** `shared/utils/use-android-nav-bar.ts`  
**Lines:** 13–37

`useAndroidNavBar(visible, openColor, restoreColor, isDark)` and `useAndroidNavBarScreen(color, isDark)` both call `NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark")`. The `openColor`, `restoreColor`, and `color` parameters are accepted but never used.

**Fix:** Unify into one function. Remove unused parameters. The two functions differ only by whether they have a `visible` dependency — handle with a single optional `deps` array argument.

---

## Part 10 · Positive Observations

Before the fix list, it is worth noting what is well-implemented:

| Area | Assessment |
|---|---|
| **Adapter pattern** | `AuthContext` uses `authAdapter` and `db` adapters correctly — no raw Firebase SDK imports in `shared/` (only in `lib/`) ✅ |
| **ThemeContext** | Synchronous initialisation via `startup-prefs` is elegant and eliminates theme flash ✅ |
| **AvatarContext** | `syncAvatarFromOutside` / `clearAvatarFromOutside` pattern for non-hook callers is the right approach ✅ |
| **ErrorBoundary** | Clean class/functional split; `withScreenErrorBoundary` HOC is production-ready ✅ |
| **BottomSheet** | `SafeAreaProvider` inside `Modal` to fix Android edge-to-edge insets is the correct fix ✅ |
| **NotificationsModal** | `memo` on list rows, helper functions at module scope — good performance awareness ✅ |
| **i18n** | 5-language coverage (EN/HI/ML/TA/TE) with a typed `useAppTranslation` wrapper ✅ |
| **TabBarContext** | `useCallback` on all handlers, `useRef` for animation values — no re-render risk ✅ |
| **useNetworkStatus** | Correct use of `NetInfo.addEventListener` instead of polling ✅ |

---

## Consolidated Fix Priority

| # | Issue | Severity | Effort |
|---|---|---|---|
| CRITICAL-1 | Move `customize/` to `features/generator` | 🔴 | Small |
| CRITICAL-2 | Remove `services/` imports from `AuthContext` | 🔴 | Medium |
| CRITICAL-3 | Remove fake `db` from `consent-manager-types.ts` | 🔴 | Trivial |
| CRITICAL-4 | Consolidate dual consent systems → keep `ConsentModal` | 🔴 | Medium |
| CRITICAL-5 | Delete `url-risk.ts` and `schema.ts` shims | 🔴 | Small |
| HIGH-6 | Unify three scroll-hide hooks into `useScrollHide` | 🟠 | Small |
| HIGH-7 | Delete local `formatRelativeTime`; use shared formatter | 🟠 | Trivial |
| HIGH-8 | Extract shared donation copy/route constant | 🟠 | Trivial |
| HIGH-9 | Delete `formatters.ts` shim | 🟠 | Trivial |
| HIGH-10 | Delete `logger.ts` shim; migrate callers | 🟠 | Small |
| HIGH-11 | Split `AuthContext` — extract user sync, cache clearing | 🟠 | Large |
| MEDIUM-12 | Replace manual nav-bar `useEffect` in `BottomSheet` | 🟡 | Trivial |
| MEDIUM-13 | Remove redundant `setTimeout` from `ToastProvider` | 🟡 | Trivial |
| MEDIUM-14 | Fix missing dep in `ConsentManager` `useEffect` | 🟡 | Trivial |
| MEDIUM-15 | Verify theme storage key alignment with startup-prefs | 🟡 | Trivial |
| MEDIUM-16 | Wrap `ColorsTab`/`LogoTab`/`OptionsTab` in `React.memo` | 🟡 | Trivial |
| MEDIUM-17 | Add `useCallback` to `NotificationsModal` imports | 🟡 | Trivial |
| MEDIUM-18 | Add `uri` prop to `SmartAvatar` for other-user avatars | 🟡 | Small |
| MEDIUM-19 | Replace `any` with `AppColors`, typed scroll events | 🟡 | Small |
| MEDIUM-20 | Fix `colors.isDark` access in `DonationBannerCard` | 🟡 | Trivial |
| MEDIUM-21 | Standardize styling; apply theme to Toast/Consent | 🟡 | Small |
| MEDIUM-22 | Replace `TouchableOpacity` with `Pressable` in `ConsentManager` | 🟡 | Trivial |
| HIGH-23 | Move `use-*.ts` hooks to `shared/hooks/` | 🟠 | Small |
| LOW-24 | Fix relative import in `ConsentManager` | 🔵 | Trivial |
| LOW-25 | Delete unused `shared/models/chat.ts` if no consumers | 🔵 | Trivial |
| LOW-26 | Move `CategorySchema` to `validators/`; delete `schema.ts` | 🔵 | Trivial |
| LOW-27 | Lazily initialize `TabBarContext` NOOP_CTX | 🔵 | Trivial |
| LOW-28 | Replace 800ms timer in `AuthContext` with `Promise.race` | 🔵 | Small |
| LOW-29 | Unify `useAndroidNavBar` / `useAndroidNavBarScreen` | 🔵 | Trivial |

---

## Dependency Graph: Current vs Target

### Current (violations highlighted)
```
features/generator ←────────────── shared/components/customize/  ← 🔴 INVERTED
services/cache     ←────────────── shared/contexts/AuthContext    ← 🔴 INVERTED
services/analysis  ←────────────── shared/utils/url-risk.ts       ← 🔴 INVERTED
store/authStore    ←────────────── shared/contexts/AuthContext    ← 🔴 INVERTED
```

### Target (correct layering)
```
features/           → shared/     → lib/adapters → lib/providers/firebase
services/           → shared/     → lib/adapters
store/              → shared/     (read-only; shared does not import store)
shared/             → packages/core, constants, lib/adapters only
```

---

*Report generated July 2026. All file references verified against current codebase state.*
