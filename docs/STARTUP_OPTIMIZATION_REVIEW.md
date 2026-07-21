# BinRo — Startup Dependency Optimization Review

**Scope**: From native process launch (user taps icon) → fully interactive Home screen  
**Date**: July 2026  
**Status**: Analysis only. No code changed.

---

## 1 — Startup Phase Map

The startup path has three distinct phases before the Home screen is interactive:

```
[NATIVE BOOT]
    │
    ▼
[PHASE 1 — Module Load / JS Bundle Evaluation]  ← synchronous, blocks everything
    │  polyfills.ts
    │  shared/i18n/index.ts   (all 5 language bundles parsed + i18next.init)
    │  lib/firebase.ts        (App + Auth + Firestore + RealtimeDB + Storage inited)
    │  lib/push-notifications.ts  (Notifications.setNotificationHandler side-effect)
    │  SplashScreen.preventAutoHideAsync()
    │
    ▼
[PHASE 2 — React Mount / Provider Chain]  ← serial waterfall today
    │
    ├─ RootLayout mounts
    │     │
    │     ├─ useFonts() kicks off font loading (async, fires useEffect)
    │     │
    │     └─ ThemeProvider
    │           │  AsyncStorage.getItem("qrguard_theme_mode")  ← BLOCKS render
    │           │  returns null until ready ← ALL children frozen here
    │           │
    │           └─ QueryClientProvider  (sync)
    │                 │
    │                 └─ AuthProvider
    │                       │  GoogleSignin.configure()  ← module-level side effect
    │                       │  WebBrowser.maybeCompleteAuthSession()  ← module-level
    │                       │  onIdTokenChanged() listener registered
    │                       │    → Firebase resolves persisted session from AsyncStorage
    │                       │    → (if unverified): adapterUser.reload() NETWORK CALL
    │                       │    → setIsLoading(false) ← unblocks SplashGate
    │                       │
    │                       └─ AvatarProvider
    │                             │  AsyncStorage.multiGet([url, version])
    │                             │
    │                             └─ ToastProvider (sync)
    │                                   │
    │                                   └─ SplashGate (waits for all 3 conditions)
    │                                   └─ ConsentGatedApp
    │                                         │  hasUserConsented() AsyncStorage read
    │                                         │  → sets consentReady=true → unblocks SplashGate
    │                                         │
    │                                         └─ AuthGatedApp
    │                                               │  2000ms independent timeout
    │                                               └─ ThemedApp → RootLayoutNav
    │
    ▼
[PHASE 3 — SplashGate opens when ALL true: fontsReady ∧ !authLoading ∧ consentReady]
    │  (or 2500ms safety timeout, whichever comes first)
    │
    ▼
[HOME SCREEN PAINT]
    │  Tabs layout mounts
    │    AsyncStorage.getItem("qrg:startup:screen")  ← runs on mount
    │  HomeScreen mounts
    │    useRecentScans() → reads history from TanStack Query cache (prewarmed or fresh)
    │    FadeIn.duration(280) entrance animation
    │
    ▼
[BACKGROUND — after first paint]
    │  registerForPushNotifications(uid)  — permission + Expo push token + HTTP POST
    │  trackAppOpen(uid)  — HTTP POST
    │  prewarmUserData(uid)  — 3× AsyncStorage reads → seeds TanStack Query
    │  queryClient.prefetchQuery(["userProfile"])  — Firestore network call
    │  GoogleSignin.signInSilently()  — Google account check (already fire-and-forget)
```

---

## 2 — Dependency Graph

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   CRITICAL PATH (blocks splash hide)    │
                    │                                                         │
  Module load ──►  polyfills ──► i18n-init ──► Firebase-init                │
                                                     │                       │
                                              ThemeProvider                  │
                                              AsyncStorage read              │
                                                     │   (returns null       │
                                                     │    until done)        │
                                                     ▼                       │
                                              Font loading ◄── useFonts()   │
                                              (4 Inter weights)              │
                                                     │                       │
                                              AuthProvider                   │
                                              onIdTokenChanged               │
                                              (Firebase persisted session    │
                                               resolves from AsyncStorage)   │
                                                     │                       │
                                              ConsentGatedApp                │
                                              hasUserConsented()             │
                                              AsyncStorage read              │
                                                     │                       │
                                              SplashGate.hideAsync() ───────►│
                    └─────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────────┐
                    │           SAFE TO PARALLELIZE / DEFER                  │
                    │                                                         │
                    │  Firebase Storage init  (never needed at startup)      │
                    │  Firebase RealtimeDB init (not used on home screen)    │
                    │  GoogleSignin.signInSilently()  (already async)        │
                    │  AvatarProvider AsyncStorage read                      │
                    │  Haptics AsyncStorage read                             │
                    │  Tab startup screen AsyncStorage read                  │
                    │  Push notification setup (after user.uid known)        │
                    │  trackAppOpen()                                        │
                    │  prewarmUserData()                                     │
                    │  prefetchQuery(userProfile)                            │
                    └─────────────────────────────────────────────────────────┘
```

---

## 3 — Task-by-Task Analysis

### T-01 · Polyfills (`polyfills.ts`)

| | |
|---|---|
| **Why it exists** | Hermes doesn't ship `Buffer`, `DOMException`, or TextEncoder/TextDecoder. Firebase SDK and QR libraries need these at import time. |
| **Must block startup** | ✅ Yes — must run before any other module that uses these globals. |
| **Can parallelize** | ❌ No — must be the first import in `_layout.tsx`. |
| **Can defer** | ❌ No — needed before Firebase and i18n modules load. |
| **Expected improvement if moved** | None. |
| **Risk** | N/A |
| **Auth / UX impact** | None. |

---

### T-02 · i18n initialization (`shared/i18n/index.ts`)

| | |
|---|---|
| **Why it exists** | Provides translated strings for every UI component. Imported at the top of `_layout.tsx` so all providers and screens can use `useTranslation()` immediately. |
| **Must block startup** | ⚠️ Partially. `i18n.init()` must be called before React renders, but loading all 5 language bundles (EN/HI/ML/TA/TE) eagerly is not required. |
| **Can parallelize** | ❌ The `init` call is synchronous (`initImmediate: false`). |
| **Can defer** | ✅ HI, ML, TA, TE bundles can be loaded lazily after first paint for users whose device locale is English (the majority of markets outside Kerala/TN/AP). |
| **Expected improvement if moved** | ~30–60 ms of synchronous JSON parsing removed from the critical path for English-locale devices. |
| **Risk** | 🟡 Low-medium — requires splitting translations into separate chunks and a lazy-load flow. If the lazy load is slow, non-English text could flash as keys. Mitigation: keep EN inline, load others asynchronously with a suspended i18n resource. |
| **Auth / UX impact** | None for auth. Minimal UX impact if non-English bundles are deferred with a stable fallback to English. |

---

### T-03 · Firebase App + Auth initialization (`lib/firebase.ts`)

| | |
|---|---|
| **Why it exists** | Firebase Auth is the identity provider. `onIdTokenChanged` cannot be registered until `initializeAuth()` has run. |
| **Must block startup** | ✅ For **Auth** — yes. Firebase app init and Auth init must run before `AuthProvider` mounts. |
| **Can parallelize** | ✅ **Firestore**, **RealtimeDB**, and **Storage** do NOT need to be initialized before the splash hides — they can each be lazily initialized on first use. |
| **Can defer** | ✅ `getStorage()` and `getDatabase()` can be deferred entirely. `initializeFirestore()` can be deferred until the first Firestore query is made (typically happens after auth resolves). |
| **Expected improvement if moved** | ~20–40 ms. `getDatabase()` opens a WebSocket connection immediately on creation; delaying this removes one startup socket from the critical path. |
| **Risk** | 🟢 Low — Firebase SDK's getter functions (`getFirestore()`, `getDatabase()`, `getStorage()`) are idempotent. Moving them to lazy initializers does not affect correctness. |
| **Auth / UX impact** | No impact on authentication. Firestore is not queried until after `onIdTokenChanged` fires. |

---

### T-04 · `ThemeProvider` blocks entire render tree

| | |
|---|---|
| **Why it exists** | Reads the saved theme preference from AsyncStorage so the app opens in the user's last-chosen theme (dark/light/system). |
| **Must block startup** | ❌ **No.** This is the single most impactful unnecessary blocker. The ThemeProvider currently returns `null` while the AsyncStorage read is pending, which freezes the entire React tree — including font loading effects and the auth listener — until the theme is known. |
| **Can parallelize** | ✅ Yes. The system default theme (`useColorScheme()`) is always available synchronously. The saved preference is a UX enhancement, not a correctness requirement. |
| **Can defer** | ✅ The app can render immediately with `mode="system"` and silently update to the stored preference when the AsyncStorage read completes. Users who kept the default setting (system) never see a flash. Users who chose dark or light mode may see a 1-frame flicker on slower devices. |
| **Expected improvement if moved** | **~80–150 ms** — this unblocks font loading and the auth listener from mounting earlier, compressing the entire waterfall. This is likely the highest single-task gain. |
| **Risk** | 🟢 Low. The default theme (system) is the correct fallback. A very brief theme-mode correction after AsyncStorage resolves affects only users who explicitly chose dark/light override. Can be eliminated by persisting theme mode to a faster synchronous store (e.g. `expo-secure-store` with synchronous read, or MMKV). |
| **Auth / UX impact** | No auth impact. Possible single-frame theme flash for <20% of users (those who override system theme). Mitigation: fade the background color transition over 100ms. |

---

### T-05 · Font loading (4 Inter weights)

| | |
|---|---|
| **Why it exists** | Custom Inter fonts are used throughout the UI. Without them, text renders in the system fallback font. `useFonts()` is called in RootLayout and `fontsReady` is a SplashGate condition. |
| **Must block startup** | ⚠️ Partially. The splash gate waits for ALL 4 weights. However, `Inter_400Regular` is the only weight needed for readable initial Home screen text. SemiBold/Bold appear in headings and are loaded last, longest. |
| **Can parallelize** | ✅ Font loading itself is already parallel (all 4 kick off concurrently via `useFonts`). The issue is that the splash gate waits for the last font, not the first. |
| **Can defer** | ✅ Medium/SemiBold/Bold can be loaded after the splash hides, with the screen becoming interactive as soon as Regular (400) is ready. The system font is an acceptable visual fallback for ~200ms on SemiBold/Bold while the others load. Alternatively, the font files can be bundled as asset preloads in `app.json` so the Metro bundler serves them from the bundle rather than the network. |
| **Expected improvement if moved** | ~50–120 ms — font loading is network I/O on first install; subsequent runs use the asset cache. If fonts are bundled via `expo-font` asset preloading, this drops to near-zero. |
| **Risk** | 🟢 Low. System fallback fonts produce identical layout metrics on most Android/iOS versions when using `Inter`. If fonts are preloaded in `app.json` `assetBundlePatterns`, they load from the bundle and this ceases to be a timing issue. |
| **Auth / UX impact** | None on auth. Minimal visual — a brief text weight mismatch before heavier fonts arrive. |

---

### T-06 · `ConsentGatedApp` — AsyncStorage consent check

| | |
|---|---|
| **Why it exists** | On first run, users must accept Terms & Privacy before seeing the app. This check reads `qrguard_consent_version` from AsyncStorage to know whether to show the modal. |
| **Must block startup** | ⚠️ The consent **display decision** must be made before the Home screen is interactive (we should not show the home screen to a non-consented user). However, the check doesn't need to block the splash gate — it can complete in the background and show the modal over the home screen if consent is missing. |
| **Can parallelize** | ✅ The `hasUserConsented()` call is just `AsyncStorage.getItem()`. It can be kicked off at the same time as font loading and theme reading — today it runs AFTER ThemeProvider and AFTER fonts, because it lives deep in the React tree. |
| **Can defer** | ✅ The consent check can be moved to start at RootLayout mount time (top of the tree) rather than waiting for it to be rendered by ConsentGatedApp. Store the result in a ref/state in RootLayout, pass it down. |
| **Expected improvement if moved** | ~40–80 ms — parallelizes a serial AsyncStorage read. |
| **Risk** | 🟢 Low — only requires lifting the `hasUserConsented()` call from `ConsentGatedApp` to `RootLayout` and starting it immediately on mount. No logic changes. |
| **Auth / UX impact** | None on auth. No UX change — the consent modal still gates the home screen for non-consented users. |

---

### T-07 · `AuthGatedApp` — independent 2-second timeout

| | |
|---|---|
| **Why it exists** | Prevents showing an indefinite spinner if Firebase Auth never resolves. Shows the app after 2 s even if auth is still loading. |
| **Must block startup** | ❌ The SplashGate already has a 2.5 s safety timeout. This 2 s timeout creates a redundant state: the AuthGatedApp renders a blank `<View>` while the splash is still visible. The two timers race each other with no coordination. |
| **Can parallelize** | N/A |
| **Can defer** | ✅ Can be removed entirely. The SplashGate's 2.5 s timeout already handles the stuck-auth case. If we want a visible loading indicator after the splash hides on slow devices, `AuthGatedApp` can simply render its children immediately and let the home screen show a skeleton. |
| **Expected improvement if moved** | Minor (~0 ms direct). Reduces complexity; removes a source of confusing empty-view flashes. |
| **Risk** | 🟢 Low — the SplashGate already provides the safety net. |
| **Auth / UX impact** | Positive — eliminates the case where the splash hides (2.5 s timeout fires) and the user sees a blank screen because AuthGatedApp's 2 s timeout hasn't fired yet but auth is still loading. |

---

### T-08 · `AvatarProvider` — AsyncStorage read at mount

| | |
|---|---|
| **Why it exists** | Reads the cached avatar URL/version from AsyncStorage so the home screen avatar renders immediately from cache without a Firestore call. |
| **Must block startup** | ❌ No. The Avatar provider does not block the splash gate. `isHydrated` is exposed for consumers to check. The home screen uses `cachedUrl` which is `null` until hydrated — this shows as an empty avatar placeholder, which is acceptable. |
| **Can parallelize** | ✅ Already non-blocking in the render sense. However, the AsyncStorage read starts only when `AvatarProvider` mounts, which is after ThemeProvider resolves. Moving theme to non-blocking pulls this earlier automatically. |
| **Can defer** | ✅ Already effectively deferred — it doesn't block splash. |
| **Expected improvement if moved** | Indirect — resolves faster when ThemeProvider no longer blocks the tree. |
| **Risk** | 🟢 None — already non-blocking. |

---

### T-09 · Multiple isolated AsyncStorage reads at startup

| | |
|---|---|
| **Why it exists** | Theme mode, avatar URL, avatar version, haptics preference, consent version, and tab startup screen are each read independently from AsyncStorage across multiple components/effects. |
| **Must block startup** | Some do (theme). Most don't. |
| **Can parallelize** | ✅ All can be combined into a single `AsyncStorage.multiGet([...allKeys])` call at app launch, eliminating 4–5 sequential AsyncStorage round-trips. |
| **Can defer** | Theme and haptics can be started immediately; consent and avatar reads already effectively run in parallel when the tree is unblocked. |
| **Expected improvement if moved** | ~20–50 ms — AsyncStorage is fast but each `getItem` call has a native bridge round-trip overhead (~5–15 ms each). A single `multiGet` amortizes this. |
| **Risk** | 🟡 Low-medium — requires a centralized "app prefs" loader. This is an architectural change but small in scope. |
| **Auth / UX impact** | None. |

---

### T-10 · Firebase Storage + RealtimeDB initialized at module load

| | |
|---|---|
| **Why it exists** | `lib/firebase.ts` exports `storage` and `realtimeDB` as module-level constants, so they're initialized when the file is first imported (at bundle evaluation time). |
| **Must block startup** | ❌ No. `storage` is not used on the home screen. `realtimeDB` is used for scan history syncing, which happens after first paint. |
| **Can parallelize** | ✅ Can be replaced with lazy getters: `let _storage: ReturnType<typeof getStorage> | null = null; export function getStorageInstance() { return _storage ?? (_storage = getStorage(firebaseApp)); }` |
| **Can defer** | ✅ Yes — `getDatabase()` opens a persistent WebSocket connection immediately. Deferring it removes one socket-open from the critical path. |
| **Expected improvement if moved** | ~20–40 ms on cold start (socket handshake removed from critical path). |
| **Risk** | 🟢 Low — getters are idempotent. All callers switch from importing `storage`/`realtimeDB` to calling a function. Purely mechanical. |
| **Auth / UX impact** | None. |

---

### T-11 · `GoogleSignin.signInSilently()` in `AuthProvider`

| | |
|---|---|
| **Why it exists** | Attempts to restore a Google session silently (without showing any UI) so returning Google Sign-In users are logged in automatically on the next launch. |
| **Must block startup** | ❌ No. It's already called in a `useEffect` (non-blocking), and Firebase's `onIdTokenChanged` handles session restoration independently from AsyncStorage persistence. |
| **Can parallelize** | ✅ Already fire-and-forget. |
| **Can defer** | ✅ Already deferred — runs after mount. **However**: if `onIdTokenChanged` fires first (which it should, from the AsyncStorage-persisted token), `signInSilently` is redundant and causes an unnecessary Google SDK network call. |
| **Expected improvement if moved** | None needed — already async. Removing it for users whose `onIdTokenChanged` already resolves would save one Google API call per launch. |
| **Risk** | 🟡 Medium — if Firebase's AsyncStorage persistence fails for any reason, `signInSilently` is the fallback. Keep it, but add a guard: only call `signInSilently` if `onIdTokenChanged` has not resolved with a user after N ms. |
| **Auth / UX impact** | Removing/guarding it requires careful testing on Android and iOS to ensure no silent-login regression. |

---

### T-12 · Push notification setup (`lib/push-notifications.ts`)

| | |
|---|---|
| **Why it exists** | `Notifications.setNotificationHandler` configures foreground notification appearance. `setupNotificationTapHandler` registers a deep-link handler so tapping a notification opens the correct screen. |
| **Must block startup** | ❌ No. |
| **Can parallelize** | ✅ `setNotificationHandler` (module-level) is synchronous and negligible (~0.5 ms). The registration (`registerForPushNotifications`) already runs in a `useEffect` after the user is known. |
| **Can defer** | ✅ `setupNotificationTapHandler` runs on `AuthGatedApp` mount. It can run later, after first paint. |
| **Expected improvement if moved** | Negligible directly. |
| **Risk** | 🟢 Low — if a notification is tapped in the ~500ms window before the handler is set up, it's handled by `getLastNotificationResponseAsync` which is not currently used but is standard practice. |

---

### T-13 · `Tab startup screen preference` — AsyncStorage read in `ClassicTabLayout`

| | |
|---|---|
| **Why it exists** | Reads `qrg:startup:screen` to redirect to the Scanner tab if the user has set that as their preferred launch screen. |
| **Must block startup** | ❌ No — it runs in a `useEffect` after the tabs mount, so it doesn't block the splash. But it can cause a visible navigation flash: Home tab renders for ~1 frame before `router.replace("/(tabs)/scanner")` fires. |
| **Can parallelize** | ✅ Can be read as part of the centralized app-prefs multiGet (T-09), so the result is known before tabs mount. |
| **Can defer** | ✅ It already runs in `useEffect`. The flash can be eliminated by reading the value earlier (in the centralized prefs load) and passing it as an initial route prop. |
| **Expected improvement if moved** | Eliminates the Scanner-tab flash for users who set Scanner as their startup screen. |
| **Risk** | 🟢 Low. |

---

## 4 — Dependency Graph: What Actually Serializes

```
Today (serial waterfall):

  polyfills ─► i18n-init ─► React mount
                                │
                    ThemeProvider AsyncStorage read
                                │  (~10–25ms, blocks tree)
                                │
                          useFonts fires
                                │  (~50–200ms, network/cache)
                                │
                      AuthProvider mounts
                      onIdTokenChanged fires
                                │  (~50–200ms, AsyncStorage + maybe network)
                                │
                      ConsentGatedApp mounts
                      hasUserConsented() AsyncStorage read
                                │  (~10ms)
                                │
                      SplashGate.hideAsync()

Estimated serial time: 120–575 ms AFTER module load

---------------------------------------------------------------------------

After optimizations (parallel):

  polyfills ─► i18n-init ─► React mount
                                │
                   ┌────────────┼─────────────────────┐
                   │            │                     │
           ThemeProvider     useFonts fires     hasUserConsented()
           AsyncStorage      (parallel,          AsyncStorage read
           (render with      async I/O)          (fire immediately)
           system default
           immediately)
                   │            │                     │
                   │       onIdTokenChanged            │
                   │       fires (Firebase             │
                   │       AsyncStorage                │
                   │       persistence)                │
                   └────────────┴─────────────────────┘
                                │
                         All ready → SplashGate.hideAsync()

Estimated serial time: 50–200 ms AFTER module load
Estimated improvement: 70–375 ms reduction (40–65% faster)
```

---

## 5 — Implementation Plan (Priority Order)

### ✅ Phase 1 — High Impact · Low Risk · No Logic Changes

These are safe to implement immediately. They preserve all business logic, auth correctness, and UX behavior.

---

#### P1-A · Remove `ThemeProvider` null-gate — render with system default immediately

**File**: `shared/contexts/ThemeContext.tsx`  
**Change**: Remove `if (!ready) return null`. Instead, render children immediately using `mode = "system"` (synchronous `useColorScheme()`) as the default. When AsyncStorage resolves, update `mode` state silently. If the stored mode differs from system, apply a 150ms background color transition to prevent a harsh flash.  
**Impact**: ⬆️ Unblocks the entire React tree 80–150ms earlier. Biggest single gain.  
**Risk**: 🟢 Low — system theme is correct for ~80% of users. ~20% who chose dark/light override see a single-frame background color correction.  
**Regression surface**: Theme rendering only.

---

#### P1-B · Move consent check to RootLayout mount (parallelize with fonts)

**File**: `app/_layout.tsx`  
**Change**: In `RootLayout`, call `hasUserConsented()` inside a `useEffect` immediately on mount (alongside the haptics read). Store result in a `consentChecked` ref. Pass result down to `ConsentGatedApp`. Remove the `onReady` callback pattern — `consentReady` can be set at the top level as soon as the AsyncStorage read finishes, independently of where `ConsentGatedApp` sits in the tree.  
**Impact**: ⬆️ Parallelizes a ~10ms AsyncStorage read that currently runs strictly after ThemeProvider + fonts.  
**Risk**: 🟢 Low — pure timing change, no logic change.

---

#### P1-C · Preload Inter fonts as bundle assets

**File**: `app.json`  
**Change**: Add Inter font files to `expo.assetBundlePatterns` so Metro bundles them with the JS. Font files then load from the bundle cache (0 ms network) on every run after the first install.  
**Impact**: ⬆️ Eliminates network I/O for font loading on warm starts (the common case). Cold start (first install) is unaffected.  
**Risk**: 🟢 None — standard Expo pattern, additive only. Adds ~200KB to bundle size (acceptable; fonts are static).  

---

#### P1-D · Remove `AuthGatedApp` independent 2-second timeout

**File**: `app/_layout.tsx`  
**Change**: Delete the `timedOut` state and `setTimeout(2000)` from `AuthGatedApp`. The SplashGate's 2.5 s safety timeout already handles stuck auth. `AuthGatedApp` should render its children immediately and let the home screen render with a skeleton if auth is still resolving.  
**Impact**: ⬆️ Eliminates the race condition where the splash hides at 2.5 s but the user sees a blank view because the 2 s timer hasn't re-rendered yet.  
**Risk**: 🟢 None — the SplashGate safety timeout is the correct single gate.

---

#### P1-E · Lazy-initialize Firebase Storage and RealtimeDB

**File**: `lib/firebase.ts`  
**Change**: Convert `storage` and `realtimeDB` from module-level constants to lazy getter functions:  
```ts
let _storage: ReturnType<typeof getStorage> | null = null;
export function getStorageInstance() {
  return _storage ?? (_storage = getStorage(firebaseApp));
}
```  
Update all import sites to call the getter instead of importing the constant.  
**Impact**: ⬆️ Removes `getDatabase()` WebSocket connection from cold-start critical path. ~20–40 ms.  
**Risk**: 🟢 Low — pure refactor, function-call semantics are identical to module export. All callers change from `import { realtimeDB }` to `import { getRealtimeDBInstance }`.

---

#### P1-F · Reduce `SplashGate` safety timeout from 2500ms → 1800ms

**File**: `app/_layout.tsx`  
**Change**: Change the safety `setTimeout` from 2500 to 1800 ms.  
**Impact**: ⬆️ On slow devices where auth or fonts are hanging, the user sees the app 700ms sooner.  
**Risk**: 🟢 Very low — on any normal device, auth + fonts resolve well under 800 ms. The safety timer only fires as a last resort. 1800 ms is still a generous safety margin.

---

### 🔶 Phase 2 — Medium Impact · Medium Risk (implement after Phase 1 is validated)

These require more structural change and should only be done after Phase 1 improvements are shipped and stable.

- **P2-A**: Centralize all AsyncStorage startup reads into a single `multiGet` ("app prefs loader") — eliminates 4–5 separate bridge round-trips.
- **P2-B**: Lazy-load non-English i18n bundles — only load HI/ML/TA/TE after first paint for non-matching device locales.
- **P2-C**: Reduce `useFonts` to only `Inter_400Regular` for the initial splash gate; load 500/600/700 after splash hides.
- **P2-D**: Add `GoogleSignin.signInSilently()` guard — skip the call if `onIdTokenChanged` already resolved with a user within 500 ms.

---

### 🔴 Phase 3 — Higher Risk (only after Phase 2 is validated)

- **P3-A**: Replace AsyncStorage for theme/haptics/consent with MMKV (synchronous, no bridge round-trip) — eliminates the theme flash entirely and makes all startup prefs free.
- **P3-B**: Move `initializeFirestore` to a lazy initializer to defer the Firestore connection until the first query.
- **P3-C**: Explore Hermes bytecode precompilation via EAS build to reduce JS evaluation time on cold start.

---

## 6 — Expected Total Improvement (Phase 1 only)

| Task | Estimated Gain |
|---|---|
| P1-A ThemeProvider unblock | 80–150 ms |
| P1-B Parallelize consent check | 10–25 ms |
| P1-C Bundle fonts as assets | 50–120 ms (warm starts) |
| P1-D Remove redundant auth timeout | 0–50 ms (eliminates blank-screen race) |
| P1-E Lazy Firebase Storage/RealtimeDB | 20–40 ms |
| P1-F Lower splash safety timeout | 0–700 ms (only on stuck devices) |
| **Phase 1 total** | **~160–385 ms on warm start** |

These are conservative estimates based on code analysis. The actual gain depends heavily on device class (budget Android is where this matters most), network latency to Firebase, and AsyncStorage I/O speed.

---

## 7 — What Must NOT Change

The following are correctly implemented and must be preserved:

1. **`SplashScreen.preventAutoHideAsync()` at module level** — must remain synchronous and at the top of `_layout.tsx` before any async I/O.
2. **`onIdTokenChanged` as the primary auth state listener** — this is the correct Firebase pattern. Do not replace with `onAuthStateChanged` (which does not fire on token refresh).
3. **`adapterUser.reload()` before resolving unverified sessions** — a network call, but required to prevent stale token cache from blocking verified users. Do not remove.
4. **`prewarmUserData()` as fire-and-forget after auth resolves** — already correctly positioned. Do not make it block the home screen render.
5. **`queryClient.prefetchQuery(["userProfile"])` after auth resolves** — already fire-and-forget. Do not move to before auth.
6. **`ConsentModal` shown over the app for non-consented users** — the consent gate is a legal/privacy requirement. Only the timing of the check changes, not the enforcement.
7. **`memoryLocalCache` for Firestore** — do not switch to `persistentLocalCache` (broken in iframe/WebView environments).
8. **`GoogleSignin.configure()` called before any sign-in attempt** — must remain in place before the first possible user interaction.
