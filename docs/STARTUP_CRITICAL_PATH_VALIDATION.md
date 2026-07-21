# BinRo — Startup Critical Path Validation

**Status**: Validated against live source. Implementation follows this document.  
**Scope**: Native process launch → Home screen fully interactive.

---

## Final Critical Path Diagram

```
NATIVE LAUNCH
│  OS spawns process, loads native modules, initialises Hermes JIT
│
▼
JS BUNDLE EVALUATION  (synchronous — everything below runs before React)
│
│  1.  polyfills.ts          Buffer, DOMException, TextEncoder, font-scale defaults
│  2.  shared/i18n/index.ts  i18next.init() + all 5 language bundles parsed (~53 KB)
│  3.  lib/firebase.ts       firebaseApp, firebaseAuth, firestore init (+ storage/rtdb TODAY)
│  4.  lib/push-notifications.ts  Notifications.setNotificationHandler() side-effect
│  5.  SplashScreen.preventAutoHideAsync()
│  ── NEW ──────────────────────────────────────────────────────────────────────
│  6.  startup-prefs.ts      AsyncStorage.multiGet([6 keys]) kicks off immediately
│
▼
REACT INITIALISATION
│
│  RootLayout mounts
│  useFonts() called → 4 Inter weights begin loading (async)
│  if (!fontsReady) return null  ← FONT GATE: only real mandatory gate remaining
│
▼
PROVIDERS (mount once fontsReady = true)
│
│  ThemeProvider      ← null-gate REMOVED; renders immediately with system default
│  QueryClientProvider
│  AuthProvider       onIdTokenChanged registered; Firebase reads AsyncStorage
│  AvatarProvider     reads from startup-prefs cache (already resolved)
│  ToastProvider
│
▼
AUTHENTICATION
│
│  Firebase onIdTokenChanged fires (50–400 ms after mount)
│  If unverified: adapterUser.reload() — one network call (unavoidable)
│  setIsLoading(false) → SplashGate condition met
│
▼
CACHE
│
│  prewarmUserData() — 3× AsyncStorage reads → TanStack Query seeded
│  prefetchQuery(userProfile) — Firestore fetch (fire-and-forget)
│
▼
FIRST PAINT  (SplashGate hides splash when: fontsReady ∧ !authLoading ∧ consentReady)
│
│  Tab layout mounts, ClassicTabLayout reads startup screen pref from cache
│  HomeScreen mounts
│  useRecentScans seeds from TanStack Query cache (prewarmed = instant)
│  FadeIn.duration(280) entrance animation
│
▼
HOME INTERACTIVE
│
▼
BACKGROUND TASKS
│
│  registerForPushNotifications(uid)  permission + Expo token + HTTP POST
│  trackAppOpen(uid)                  HTTP POST
│  GoogleSignin.signInSilently()      deferred 800ms; skipped if auth already resolved
│  Firestore/RTDB connections         opened on first use (lazy init)
```

---

## Operation Validation Table

| # | Operation | File | Timing Today | Validation Result | Safe to Defer? | Impact |
|---|---|---|---|---|---|---|
| 1 | polyfills | `polyfills.ts` | Module load | ✅ Must block — Firebase/i18n need Buffer/TextEncoder before first import | ❌ | None |
| 2 | i18n init (5 bundles) | `shared/i18n/index.ts` | Module load | ⚠️ Init must be synchronous; **53 KB** of non-English bundles waste parse time for EN devices | Phase 2 only | ~30–60 ms |
| 3 | Firebase App + Auth | `lib/firebase.ts` | Module load | ✅ Must block — `onIdTokenChanged` cannot register without `firebaseAuth` | ❌ | — |
| 4 | Firebase Firestore | `lib/firebase.ts` | Module load | ✅ Must be available when `AuthProvider` fires its effect (same tick). Keep as-is. | ❌ | — |
| 5 | **Firebase RealtimeDB** | `lib/firebase.ts` | Module load | ✅ **Safe to lazy-init** — only used by `lib/db/providers/firebase.ts` inside function bodies, never at module-level. `getDatabase()` opens a WebSocket. | ✅ Lazy | ~20–40 ms |
| 6 | **Firebase Storage** | `lib/firebase.ts` | Module load | ✅ **Safe to lazy-init** — only used in `lib/storage/providers/firebase.ts` inside function bodies. Not needed until avatar upload. | ✅ Lazy | ~10–15 ms |
| 7 | Notifications handler | `lib/push-notifications.ts` | Module load | ✅ Lightweight side-effect (~0 ms). Must be set before any notification fires. Keep. | ❌ | — |
| 8 | **ThemeProvider null gate** | `shared/contexts/ThemeContext.tsx` | After font gate | ✅ **Remove gate** — `useColorScheme()` provides system default synchronously. Async preference read can update silently. | ✅ Remove gate | ~80–150 ms |
| 9 | **Font loading** | `app/_layout.tsx` `useFonts` | React mount | ⚠️ Gate is necessary (fonts needed for UI), but bundling fonts as assets eliminates network I/O on warm starts. | ✅ Bundle assets | ~50–120 ms |
| 10 | **Consent AsyncStorage** | `ConsentGatedApp` | After ThemeProvider | ✅ **Hoist to module-load startup-prefs batch.** Result known before first render. Eliminates blank `#0A0E17` flash. | ✅ Cache | ~10–40 ms |
| 11 | Haptics pref | `app/_layout.tsx` | After font gate | ✅ Non-blocking today. Moves to startup-prefs batch (free). | ✅ Cache | — |
| 12 | **AuthGatedApp 2s timeout** | `app/_layout.tsx` | After font gate | ✅ **Remove** — races with SplashGate 2.5s timeout, causing blank-screen window. SplashGate is sufficient. | ✅ Remove | 0–50 ms race |
| 13 | `onIdTokenChanged` listener | `shared/contexts/AuthContext.tsx` | Provider mount | ✅ Must be registered immediately after `AuthProvider` mounts. Unavoidable blocking step. | ❌ | — |
| 14 | `adapterUser.reload()` | `shared/contexts/AuthContext.tsx` | Inside auth cb | ✅ Required — prevents stale email-verification token from blocking verified users. Keep. | ❌ | — |
| 15 | **AvatarProvider AsyncStorage** | `shared/contexts/AvatarContext.tsx` | Provider mount | ✅ Non-blocking, but separate bridge call. Moves to startup-prefs batch. | ✅ Cache | ~5–15 ms |
| 16 | **GoogleSignin.signInSilently** | `shared/contexts/AuthContext.tsx` | Provider mount | ⚠️ Already async. Add 800ms guard: skip if `onIdTokenChanged` already resolved. | ✅ Guard | 1 SDK call saved |
| 17 | prewarmUserData | `services/prewarm.ts` | After auth | ✅ Already fire-and-forget. Correct position. | ✅ Already deferred | — |
| 18 | prefetchQuery userProfile | `shared/contexts/AuthContext.tsx` | After auth | ✅ Already fire-and-forget. Correct position. | ✅ Already deferred | — |
| 19 | Tab startup screen pref | `app/(tabs)/_layout.tsx` | After splash | ✅ Moves to startup-prefs batch; read from cache synchronously to eliminate Scanner-tab flash. | ✅ Cache | Flash eliminated |
| 20 | Push registration | `app/_layout.tsx` | After user.uid | ✅ Already correctly deferred. Keep. | ✅ Already deferred | — |
| 21 | **Multi AsyncStorage batch** | Multiple files | Scattered | ✅ **6 separate bridge calls → 1 `multiGet`** kicked off at module-load time (before React renders). | ✅ Batch | ~25–60 ms |

---

## Race Condition & Safety Verification

| Change | Race Condition Risk | Verification |
|---|---|---|
| Remove ThemeProvider null gate | Theme flash for users with dark/light override | Acceptable: system default is correct fallback; AsyncStorage resolves in <20ms after mount (startup-prefs already done) |
| Parallelize consent check | Could show home screen before consent modal mounts | ❌ Not possible: ConsentModal is rendered by ConsentGatedApp which is always in tree; it shows over the app via `<Modal>` |
| Lazy Firebase Storage | Storage used before init | ❌ Not possible: `getStorageInstance()` lazily creates once; only called inside StorageAdapter functions, not at import time |
| Lazy Firebase RealtimeDB | RealtimeDB used before init | ❌ Not possible: only used inside `firebaseRtdb` adapter function bodies (line 199–243 of lib/db/providers/firebase.ts), which are called after auth resolves |
| Remove AuthGatedApp 2s timeout | Blank screen after splash | ❌ SplashGate 2.5s safety timeout prevents this. ThemedApp renders immediately when `!isLoading || timedOut` → removing `timedOut` means it waits for `!isLoading`, which SplashGate independently handles |
| startup-prefs multiGet | Consent state stale | ❌ `CONSENT_VERSION` is checked on read; `handleAccept()` still calls `saveConsent()` and flips local state |
| Google Sign-In 800ms guard | Misses valid silent sign-in | Low risk: 800ms > median Firebase restore time (50–400ms). If Firebase fails to restore, signInSilently runs at 800ms as normal |

---

## Expected Cumulative Improvement (Phase 1)

| Change | Warm Start | Cold Start |
|---|---|---|
| Remove ThemeProvider null gate | 80–150 ms | 80–150 ms |
| Parallelize consent via startup-prefs | 10–40 ms | 10–40 ms |
| Bundle fonts as assets | 50–120 ms | 0 ms |
| Lazy Firebase Storage + RealtimeDB | 20–40 ms | 20–40 ms |
| Batch AsyncStorage reads (multiGet) | 25–60 ms | 25–60 ms |
| Remove AuthGatedApp redundant timeout | 0–50 ms race fix | 0–50 ms |
| **Total** | **~185–460 ms** | **~135–340 ms** |

---

## What Is Not Changed (Intentionally)

- `SplashScreen.preventAutoHideAsync()` — must stay module-level and first
- `onIdTokenChanged` — correct Firebase auth pattern; cannot defer
- `adapterUser.reload()` for unverified users — prevents token staleness bug
- `prewarmUserData()` — already correctly fire-and-forget after auth
- `memoryLocalCache` for Firestore — persistent cache breaks in WebView/iframe
- Splash timeout **not lowered** — requires real-device metrics first (⚠️)
- i18n lazy splitting — Phase 2 only (needs bundle splitting infrastructure)
